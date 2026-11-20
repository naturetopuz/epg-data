#!/usr/bin/env python3
"""
Tik Ko'r ilovasi uchun: ochiq ro'yxatlardagi bepul serverlarni yig'ib, har birini sinab,
TikTok ochiladigan va tez ishlaydiganlaridan eng yaxshi 40 tasini servers.json ga yozadi.
"""
import base64, json, os, random, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

XRAY = sys.argv[1] if len(sys.argv) > 1 else "./xray"
OUT = sys.argv[2] if len(sys.argv) > 2 else "servers.json"

SUBS = [
    "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/super-sub.txt",
    "https://raw.githubusercontent.com/0xRadikal/Free-v2ray-Configs/main/verified/configs_base64.txt",
    "https://raw.githubusercontent.com/morpheusadam/v2ray-config/main/subs/bundles/best.txt",
    "https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/main/V2Ray-Config-By-EbraSha.txt",
    "https://raw.githubusercontent.com/Epodonios/v2ray-configs/main/All_Configs_Sub.txt",
    "https://raw.githubusercontent.com/hamedcode/port-based-v2ray-configs/main/sub/vless.txt",
    "https://raw.githubusercontent.com/hamedcode/port-based-v2ray-configs/main/sub/trojan.txt",
    "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/subs/sub1.txt",
]
MAX_CANDIDATES = 1500
KEEP = 40
log = []


def say(s):
    print(s, flush=True)
    log.append(s)


def b64d(s):
    s = s.strip().replace("-", "+").replace("_", "/")
    s += "=" * (-len(s) % 4)
    return base64.b64decode(s).decode("utf-8", "ignore")


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        txt = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "ignore")
    except Exception as e:
        say(f"ro'yxat olinmadi: {url} ({e})")
        return []
    if "://" not in txt[:2000]:
        try:
            txt = b64d(txt)
        except Exception:
            pass
    links = re.findall(r"(?:vmess|vless|trojan|ss)://[^\s]+", txt)
    say(f"{len(links):6d} ta  {url}")
    return links


def q(params, k, d=""):
    v = params.get(k, [d])[0]
    return urllib.parse.unquote(v) if v else d


def stream(net, sec, p):
    """Ulanish turi va shifrlash (xray streamSettings)."""
    net = (net or "tcp").lower()
    if net in ("h2", "http", "kcp", "mkcp", "quic"):
        return None
    st = {"network": net}
    host = p.get("host", "")
    path = p.get("path", "") or "/"
    if net == "ws":
        st["wsSettings"] = {"path": path, "headers": {"Host": host} if host else {}}
    elif net == "grpc":
        st["grpcSettings"] = {"serviceName": p.get("serviceName", ""), "multiMode": p.get("mode") == "multi"}
    elif net == "httpupgrade":
        st["httpupgradeSettings"] = {"path": path, "host": host}
    elif net in ("xhttp", "splithttp"):
        st["network"] = "xhttp"
        st["xhttpSettings"] = {"path": path, "host": host, "mode": p.get("mode", "auto") or "auto"}
    elif net == "tcp":
        if p.get("headerType") == "http":
            st["tcpSettings"] = {"header": {"type": "http", "request": {"path": [path], "headers": {"Host": [host] if host else []}}}}
    else:
        return None
    sec = (sec or "none").lower()
    sni = p.get("sni", "") or host
    fp = p.get("fp", "") or "chrome"
    if sec == "tls":
        tls = {"serverName": sni, "fingerprint": fp}
        alpn = p.get("alpn", "")
        if alpn:
            tls["alpn"] = [a for a in alpn.split(",") if a]
        st["security"] = "tls"
        st["tlsSettings"] = tls
    elif sec == "reality":
        if not p.get("pbk"):
            return None
        st["security"] = "reality"
        st["realitySettings"] = {
            "serverName": sni, "fingerprint": fp, "publicKey": p["pbk"],
            "shortId": p.get("sid", ""), "spiderX": p.get("spx", "") or "/",
        }
    elif sec not in ("none", ""):
        return None
    return st


def hostport(netloc):
    m = re.match(r"^\[?([^\]]+?)\]?:(\d+)$", netloc)
    if not m:
        return None, None
    return m.group(1), int(m.group(2))


def parse(link):
    try:
        if link.startswith("vmess://"):
            j = json.loads(b64d(link[8:].split("#")[0]))
            port = int(j.get("port", 0))
            if not j.get("add") or not port or not j.get("id"):
                return None
            p = {"host": j.get("host", ""), "path": j.get("path", ""), "sni": j.get("sni", ""),
                 "fp": j.get("fp", ""), "alpn": j.get("alpn", ""), "headerType": j.get("type", ""),
                 "serviceName": j.get("path", ""), "mode": ""}
            st = stream(j.get("net", "tcp"), "tls" if j.get("tls") == "tls" else "none", p)
            if st is None:
                return None
            return {"protocol": "vmess", "settings": {"vnext": [{"address": j["add"], "port": port, "users": [
                {"id": j["id"], "security": j.get("scy") or "auto"}]}]}, "streamSettings": st}
        u = urllib.parse.urlsplit(link.split("#")[0])
        params = urllib.parse.parse_qs(u.query)
        p = {k: q(params, k) for k in ("host", "path", "sni", "fp", "alpn", "pbk", "sid", "spx",
                                       "serviceName", "mode", "headerType", "flow", "security", "type")}
        if link.startswith("vless://"):
            uid = urllib.parse.unquote(u.username or "")
            h, port = hostport(u.netloc.split("@")[-1])
            if not uid or not h:
                return None
            st = stream(p["type"] or "tcp", p["security"] or "none", p)
            if st is None:
                return None
            user = {"id": uid, "encryption": "none"}
            if p["flow"]:
                user["flow"] = p["flow"]
            return {"protocol": "vless", "settings": {"vnext": [{"address": h, "port": port, "users": [user]}]},
                    "streamSettings": st}
        if link.startswith("trojan://"):
            pw = urllib.parse.unquote(u.username or "")
            h, port = hostport(u.netloc.split("@")[-1])
            if not pw or not h:
                return None
            st = stream(p["type"] or "tcp", p["security"] or "tls", p)
            if st is None:
                return None
            return {"protocol": "trojan", "settings": {"servers": [{"address": h, "port": port, "password": pw}]},
                    "streamSettings": st}
        if link.startswith("ss://"):
            if "plugin" in params:
                return None
            body = link[5:].split("#")[0].split("?")[0]
            if "@" in body:
                cred, hp = body.rsplit("@", 1)
                try:
                    cred = b64d(urllib.parse.unquote(cred))
                except Exception:
                    cred = urllib.parse.unquote(cred)
            else:
                dec = b64d(body)
                cred, hp = dec.rsplit("@", 1)
            method, pw = cred.split(":", 1)
            h, port = hostport(hp)
            if not h:
                return None
            return {"protocol": "shadowsocks", "settings": {"servers": [
                {"address": h, "port": port, "method": method, "password": pw}]}}
    except Exception:
        return None
    return None


def key(o):
    s = o["settings"]
    srv = (s.get("vnext") or s.get("servers"))[0]
    ident = (srv.get("users") or [{}])[0].get("id") or srv.get("password", "")
    return (o["protocol"], srv["address"], srv["port"], ident)


def valid(o):
    """xray bu sozlamani qabul qiladimi."""
    cfg = {"log": {"loglevel": "none"}, "inbounds": [{"port": 1, "listen": "127.0.0.1", "protocol": "socks"}],
           "outbounds": [dict(o, tag="t")]}
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(cfg, f)
    try:
        r = subprocess.run([XRAY, "run", "-test", "-c", f.name], capture_output=True, timeout=20)
        return r.returncode == 0
    except Exception:
        return False
    finally:
        os.unlink(f.name)


def curl(port, url, timeout, out="/dev/null"):
    r = subprocess.run(
        ["curl", "-s", "-o", out, "-m", str(timeout), "--socks5-hostname", f"127.0.0.1:{port}",
         "-w", "%{http_code} %{time_total} %{size_download}", url],
        capture_output=True, text=True)
    try:
        code, t, size = r.stdout.split()
        return int(code), float(t), int(float(size))
    except Exception:
        return 0, 99.0, 0


def test_batch(batch, base_port):
    cfg = {"log": {"loglevel": "none"}, "inbounds": [], "outbounds": [], "routing": {"rules": []}}
    for i, o in enumerate(batch):
        cfg["inbounds"].append({"tag": f"i{i}", "port": base_port + i, "listen": "127.0.0.1", "protocol": "socks",
                                "settings": {"udp": False}})
        cfg["outbounds"].append(dict(o, tag=f"o{i}"))
        cfg["routing"]["rules"].append({"type": "field", "inboundTag": [f"i{i}"], "outboundTag": f"o{i}"})
    path = f"/tmp/batch{base_port}.json"
    json.dump(cfg, open(path, "w"))
    proc = subprocess.Popen([XRAY, "run", "-c", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    results = []

    def one(i):
        port = base_port + i
        code, t1, _ = curl(port, "https://www.tiktok.com/robots.txt", 10)
        if code != 200:
            return None
        code2, _, _ = curl(port, "https://www.gstatic.com/generate_204", 8)
        if code2 != 204:
            return None
        code3, t3, size = curl(port, "https://speed.cloudflare.com/__down?bytes=2000000", 15)
        kbps = int(size * 8 / 1000 / max(t3, 0.1)) if size > 0 else 0
        return {"i": i, "ms": int(t1 * 1000), "kbps": kbps}

    with ThreadPoolExecutor(60) as ex:
        for r in ex.map(one, range(len(batch))):
            if r:
                results.append(r)
    proc.kill()
    return [(batch[r["i"]], r["ms"], r["kbps"]) for r in results]


def main():
    t0 = time.time()
    links = []
    for s in SUBS:
        links += fetch(s)
    seen, outs = set(), []
    for l in links:
        o = parse(l.strip())
        if not o:
            continue
        k = key(o)
        if k in seen:
            continue
        seen.add(k)
        outs.append(o)
    say(f"jami noyob: {len(outs)}")
    random.shuffle(outs)
    outs = outs[:MAX_CANDIDATES]
    with ThreadPoolExecutor(16) as ex:
        ok = list(ex.map(valid, outs))
    outs = [o for o, v in zip(outs, ok) if v]
    say(f"xray qabul qildi: {len(outs)}")

    good = []
    for b in range(0, len(outs), 200):
        good += test_batch(outs[b:b + 200], 20000 + (b // 200) * 300)
        say(f"sinaldi {min(b + 200, len(outs))}/{len(outs)}, ishlaydi: {len(good)}")
    # Tezlik va javob vaqtiga qarab saralash
    good.sort(key=lambda g: (-(min(g[2], 30000)) + g[1] * 5))
    best = good[:KEEP]
    data = {
        "generated": int(time.time()),
        "tested": len(outs),
        "working": len(good),
        "servers": [{"outbound": o, "ms": ms, "kbps": kbps} for o, ms, kbps in best],
    }
    json.dump(data, open(OUT, "w"), separators=(",", ":"))
    say(f"tayyor: {len(best)} ta server ({int(time.time() - t0)} s)")
    for o, ms, kbps in best[:10]:
        srv = (o["settings"].get("vnext") or o["settings"].get("servers"))[0]
        say(f"  {o['protocol']:11s} {o.get('streamSettings', {}).get('network', 'tcp'):6s} {ms:5d} ms {kbps:6d} kbit/s")
    open("hisobot.txt", "w").write("\n".join(log) + "\n")


if __name__ == "__main__":
    main()
