---
layout: post
title: CURL file upload and Ko
category: web hacks
tags: curl hacks
published: true
summary: Most popular curl post combinations this year
---

# Звичайний POST 

`curl -i -X POST -d 'param1=value1&param2=value2' http://example.com/`

`curl -i -X POST "http://example.com/?a=b&c=d"`

# POST JSON 

`curl -i -X POST -d '{"key1":"value1","key2":{"key21":"value21"}}' http://example.com/`

звичайно той же JSON можна запхати в значення одного з ключів

`curl -i -X POST -d 'key={"key1":"value1","key2":{"key21":"value21"}}' http://example.com/`

проте якщо треба кудись завантажити файл то доведеться перейти в режим `multipart/form-data`

# POST multipart/form-data, a.k.a. upload

`curl -i -F 'key1=value1' -F 'key2=value2' -F 'key0=@localfile.dat' http://example.com/`

__Важливий момент__ кожен наступна пара ключ-занчення додається через окремий `-F`. Чому не `&`? Тому, що `&` це частина так званого `application/x-www-form-urlencoded` запиту і йому в цій компанії не місце :)

