# Teledastur

Telekanallar uchun ochiq teledastur (EPG) ma'lumotlari. Har 6 soatda avtomatik yangilanadi.

- `epg/<davlat>.json` — `{ "<kanal kaliti>": [[boshlanish, tugash, "ko'rsatuv"], ...] }`, vaqtlar Unix soniyada (UTC)
- `indeks.json` — kanal kalitlari va nomlari
- `tools/epg.py` — yig'uvchi skript

Manbalar: O'zMTRK rasmiy API, epgshare01, iptvx.one (ochiq XMLTV).
