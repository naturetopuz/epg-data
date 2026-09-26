"""
Teledastur (EPG) yig'uvchi. GitHub Actions'da har kuni ishlaydi.

Manbalar:
  - O'zMTRK rasmiy API (api.mtrk.uz) — O'zbekiston milliy va viloyat kanallari
  - Ochiq XMLTV fayllari (epgshare01, iptvx.one) — boshqa davlatlar
Natija: epg/<davlat>.json  =  { "<uid>": [[boshlanish, tugash, "nomi"], ...], ... }
  (vaqtlar — Unix soniyalarda, UTC; faqat hozirdan -3 soat ... +36 soat oralig'i)
"""
import csv, datetime as dt, glob, gzip, io, json, os, re, sys, unicodedata, urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict

INDEKS = "indeks.json"
OUT = "epg"
DB = sys.argv[1] if len(sys.argv) > 1 else "iptv-database/data"
UA = {"User-Agent": "Mozilla/5.0 (TVDunyo EPG)"}
NOW = dt.datetime.now(dt.timezone.utc)
FROM = NOW - dt.timedelta(hours=3)
TO = NOW + dt.timedelta(hours=36)
TASHKENT = dt.timezone(dt.timedelta(hours=5))

CIS = {"ru","by","kz","uz","kg","tj","tm","az","am","ge","md","ua"}
# (manba, nom bo'yicha moslash mumkin bo'lgan davlatlar). ID bo'yicha moslash hamma davlatga ishlaydi.
XMLTV = [
    ("https://iptvx.one/epg/epg.xml.gz", CIS),
    ("https://epgshare01.online/epgshare01/epg_ripper_UK1.xml.gz", {"uk"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_US1.xml.gz", {"us"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_DE1.xml.gz", {"de"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_FR1.xml.gz", {"fr"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_ES1.xml.gz", {"es"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_IT1.xml.gz", {"it"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz", {"tr"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_TR3.xml.gz", {"tr"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_PT1.xml.gz", {"pt"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_CA1.xml.gz", {"ca"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_AU1.xml.gz", {"au"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_BR1.xml.gz", {"br"}),
    ("https://epgshare01.online/epgshare01/epg_ripper_PLEX1.xml.gz", set()),
    ("https://epgshare01.online/epgshare01/epg_ripper_DISTROTV1.xml.gz", set()),
    ("https://epgshare01.online/epgshare01/epg_ripper_RAKUTEN1.xml.gz", set()),
]
CYR_CC = {"ru", "by", "kz", "kg", "tj", "ua"}


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").lower().replace("ё", "е")
    s = re.sub(r"\(.*?\)|\[.*?\]|#\d+", " ", s)
    s = re.sub(r"\b(hd|fhd|uhd|sd|4k|tv|тв|телеканал|канал)\b", " ", s)
    return re.sub(r"[^0-9a-zа-яўқғҳ]", "", s)


def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    if url.endswith(".gz") or data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return data


def ts(s):
    """XMLTV vaqti: 20260927143000 +0300"""
    m = re.match(r"(\d{14})\s*([+-]\d{4})?", s or "")
    if not m:
        return None
    t = dt.datetime.strptime(m.group(1), "%Y%m%d%H%M%S")
    off = m.group(2) or "+0000"
    tz = dt.timezone(dt.timedelta(hours=int(off[:3]), minutes=int(off[0] + off[3:])))
    return int(t.replace(tzinfo=tz).timestamp())


# ---------- Bizning kanallar va ularning nomlari ----------
chdb = {}
if os.path.exists(os.path.join(DB, "channels.csv")):
    chdb = {r["id"]: r for r in csv.DictReader(open(os.path.join(DB, "channels.csv"), encoding="utf-8"))}

ours = {}                    # uid -> (cc, kanal)
by_id = defaultdict(list)    # iptv-org id -> [uid]
by_name = defaultdict(list)  # normallashgan nom -> [uid]
mtrk = {}                    # MTRK stream raqami -> [uid]
shifted = {}                 # uid -> (soat, asosiy id, asosiy nom) — "(+4)" kabi vaqt mintaqasi efirlari
SHIFT_RE = re.compile(r"\(\s*\+\s*(\d{1,2})\s*\)|\s\+\s?(\d{1,2})\s*$")


def norm_keep(s):
    """Raqamlarni saqlagan holda (masalan "НТВ +4" -> "нтв4")"""
    s = unicodedata.normalize("NFKC", s or "").lower().replace("ё", "е")
    s = re.sub(r"\b(hd|fhd|uhd|sd|4k|tv|тв|телеканал|канал)\b", " ", s)
    return re.sub(r"[^0-9a-zа-яўқғҳ]", "", s)


# indeks.json — havolasiz kanal ro'yxati (uid, davlat, iptv-org ID, nom, MTRK raqami)
for ch in json.load(open(INDEKS, encoding="utf-8")):
    uid, cc = ch["uid"], ch["cc"]
    ours[uid] = (cc, ch)
    if ch.get("mtrk"):
        mtrk.setdefault(ch["mtrk"], []).append(uid)
    m = SHIFT_RE.search(ch["name"])
    if m:
        # Vaqt siljigan efir: o'zining dasturi bo'lsa "нтв4" kabi nom bilan topiladi,
        # bo'lmasa asosiy kanal dasturi soatga surib olinadi
        shifted[uid] = (int(m.group(1) or m.group(2)), (ch.get("id") or "").lower(), norm(SHIFT_RE.sub("", ch["name"])))
        by_name[norm_keep(ch["name"])].append(uid)
        continue
    if ch.get("id"):
        by_id[ch["id"].lower()].append(uid)
        info = chdb.get(ch["id"])
        if info:
            for n in [info["name"]] + [a for a in info["alt_names"].split(";") if a]:
                by_name[norm(n)].append(uid)
    by_name[norm(ch["name"])].append(uid)

epg = defaultdict(dict)  # cc -> uid -> [prog]


score = {}  # uid -> manba ustuvorligi (MTRK 3, ID 2, nom 1)


def put(uids, progs, sc):
    for uid in set(uids):
        cc, _ = ours[uid]
        old = score.get(uid, 0)
        if sc > old or (sc == old and len(progs) > len(epg[cc].get(uid, []))):
            epg[cc][uid] = progs
            score[uid] = sc


def cyr_ok(progs):
    """Rus tilidagi kanalga boshqa tildagi (masalan litva, latish) dastur tushib qolmasin"""
    if not progs:
        return False
    n = sum(1 for p in progs if re.search(r"[а-яА-Я]", p[2]))
    return n >= 0.3 * len(progs)


# ---------- 1. O'zMTRK ----------
def mtrk_epg():
    try:
        lists = json.loads(fetch("https://api.mtrk.uz/api/v1/tv/channel-centerral-list/")) + \
                json.loads(fetch("https://api.mtrk.uz/api/v1/tv/channel-regional-list/"))
    except Exception as e:
        print("MTRK ro'yxati olinmadi:", e)
        return
    n = 0
    for ch in lists:
        m = re.search(r"/stream/(\d+)/", ch.get("stream_url") or "")
        if not m or m.group(1) not in mtrk:
            continue
        rows = []
        for day in [NOW.astimezone(TASHKENT).date() + dt.timedelta(days=k) for k in (-1, 0, 1)]:
            try:
                rows += json.loads(fetch(f"https://api.mtrk.uz/api/v1/telecast/{ch['id']}/?air_date={day}"))
            except Exception:
                pass
        starts = []
        for r in rows:
            try:
                t = dt.datetime.strptime(f"{r['air_date']} {r['air_time']}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=TASHKENT)
                starts.append((int(t.timestamp()), (r.get("show") or "").strip().rstrip(")").strip()))
            except Exception:
                pass
        starts = sorted(set(starts))
        progs = []
        for i, (st, title) in enumerate(starts):
            end = starts[i + 1][0] if i + 1 < len(starts) else st + 3600
            if end >= FROM.timestamp() and st <= TO.timestamp() and title:
                progs.append([st, end, title])
        if progs:
            put(mtrk[m.group(1)], progs, 3)
            n += 1
    print(f"MTRK: {n} kanal")


# ---------- 2. XMLTV ----------
def xmltv(url, name_cc):
    try:
        data = fetch(url, timeout=300)
    except Exception as e:
        print("  olinmadi:", url, e)
        return
    chan_uids = {}   # xml kanal id -> ([uid], ball)
    progs = defaultdict(list)
    for ev, el in ET.iterparse(io.BytesIO(data), events=("end",)):
        if el.tag == "channel":
            cid = el.get("id") or ""
            key = cid.lower().split("@")[0]
            # 1) iptv-org ID aynan mos ("BBCOne.uk", "BBC.One.uk")
            uids, sc = [], 2
            for k in (key, re.sub(r"\.(?=.*\.)", "", key)):
                if by_id.get(k):
                    uids = list(by_id[k]); break
            # 2) Nom bo'yicha — faqat shu manba davlatlaridagi kanallarga
            if not uids and name_cc:
                sc = 1
                for dn in el.findall("display-name"):
                    for k in {norm(dn.text), norm_keep(dn.text)}:
                        uids += [u for u in by_name.get(k, []) if ours[u][0] in name_cc]
                    if uids:
                        break
            if uids:
                chan_uids[cid] = (uids, sc)
            el.clear()
        elif el.tag == "programme":
            cid = el.get("channel")
            if cid in chan_uids:
                st, en = ts(el.get("start")), ts(el.get("stop"))
                if st and en and en >= FROM.timestamp() - 24 * 3600 and st <= TO.timestamp():
                    t = el.find("title")
                    if t is not None and t.text:
                        progs[cid].append([st, en, t.text.strip()[:120]])
            el.clear()
    n = 0
    for cid, p in progs.items():
        p = sorted({tuple(x) for x in p})
        p = [list(x) for x in p]
        uids, sc = chan_uids[cid]
        if sc == 1:
            uids = [u for u in uids if ours[u][0] not in CYR_CC or cyr_ok(p)]
        if uids:
            put(uids, p, sc)
            n += 1
    print(f"  {url.split('/')[-1]}: {n} kanal")


mtrk_epg()
for u, ccs in XMLTV:
    xmltv(u, ccs)

# Vaqt mintaqasi efirlari ("НТВ (+4)"): o'z dasturi topilmasa, asosiy kanal dasturi N soat oldinga suriladi
# (Moskva+4 efiri ko'rsatuvni Moskvadan 4 soat oldin beradi)
base_by_id, base_by_name = {}, {}
for uid, (cc, ch) in ours.items():
    if uid in shifted or uid not in epg[cc]:
        continue
    if ch.get("id"):
        base_by_id.setdefault(ch["id"].lower(), epg[cc][uid])
    base_by_name.setdefault((cc, norm(ch["name"])), epg[cc][uid])
k = 0
for uid, (h, bid, bname) in shifted.items():
    cc, _ = ours[uid]
    if uid in epg[cc]:
        continue
    base = base_by_id.get(bid) or base_by_name.get((cc, bname))
    if base:
        epg[cc][uid] = [[a - h * 3600, b - h * 3600, t] for a, b, t in base]
        k += 1
print(f"Vaqt siljigan efirlar: {k}")

# Oynani qirqish: hozirdan -3 soat ... +36 soat
for cc in list(epg):
    for uid in list(epg[cc]):
        epg[cc][uid] = [p for p in epg[cc][uid] if p[1] >= FROM.timestamp() and p[0] <= TO.timestamp()]
        if not epg[cc][uid]:
            del epg[cc][uid]

os.makedirs(OUT, exist_ok=True)
for f in glob.glob(os.path.join(OUT, "*.json")):
    os.remove(f)
total = 0
for cc, d in epg.items():
    if not d:
        continue
    json.dump(d, open(os.path.join(OUT, f"{cc}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    total += len(d)
json.dump({"updated": int(NOW.timestamp()), "channels": total},
          open(os.path.join(OUT, "info.json"), "w"), separators=(",", ":"))
print(f"Jami teledasturli kanal: {total} ({len(epg)} davlat)")
