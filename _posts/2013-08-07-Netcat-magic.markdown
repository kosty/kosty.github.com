---
layout: post
title: Netcat magic
category: unix tools
tags: netcat magic network unix
published: true
summary: В одній акуратно зібрано статті майже все про netcat
---

Замість telnet (працює ctrl-c, для статистики можна додати -v, -vv)

    $ nc www.google.com 80

###Сервер

    $ nc -l -p 12345
    
__Кажуть__ на маках `-p` не котить разом з `-l`, тож пишемо просто 

    $ nc -l 12345

###Чат. 
На першому компі (адреса 10.10.10.10) запустити:

    usr@server$ nc -l -p 12345

На клієнті запустити:

    usr@client$ nc 10.10.10.10 12345
    
###Передача файлів

##### директорії
На компі, де лежать файли:

    $ tar -c /data | nc -l -p 6666

На компі, куди копіюють файли:

    $ nc 10.10.10.10 6666 | tar -xf -
     
##### файли
Якщо файл один, то можна і без архівування:

    $ nc -l -p 6666 < file

і відповідно:

    $ nc 10.10.10.10 6666 > file
    
#### пристрої
для екстремалів, можна хоч цілий диск скопіювати:

    $ nc -l -p 6666 < /dev/hdb

і такий же екстремальний запис:

    $ nc 192.168.1.10 6666 > /dev/hdb
    
### Сканування портів

    $ nc -v -n -z -w 1 192.168.1.2 1-1000 
    (UNKNOWN) [192.168.1.2] 445 (microsoft-ds) open
    (UNKNOWN) [192.168.1.2] 139 (netbios-ssn) open
    (UNKNOWN) [192.168.1.2] 111 (sunrpc) open
    (UNKNOWN) [192.168.1.2] 80 (www) open
    (UNKNOWN) [192.168.1.2] 25 (smtp) : Connection timed out
    (UNKNOWN) [192.168.1.2] 22 (ssh) open
    
`-n` опустити перевірку  DNS, `-z` забити на відповідь інфу прислану з сервера `-w 1` "відвалюватись" за секунду після з'єднання.

### Проксі

Пересилати данні з локального порта 12345 на `www.google.com` (ну й на http порт - кажуть він в них відкритий)

    $ nc -l -p 12345 | nc www.google.com 80
    
Проте відповіді так не дочекаєшся, для цього треба ще один куско "труби"

    $ nc -l -p 12345 | nc www.google.com 80 | nc -l -p 12346
    
після того як надіслали запит на 12345, можна підключитись до 12346, щоб отримати відповідь

### Сервак для будь-чого

    $ nc -l -p 12345 -e /bin/bash
    
тепер можна робити такі дикі штуки, як:

    $ nc localhost 12345
    ls -las
    total 4288
    4 drwxr-xr-x 15 pkrumins users    4096 2009-02-17 07:47 .
    4 drwxr-xr-x  4 pkrumins users    4096 2009-01-18 21:22 ..
    8 -rw-------  1 pkrumins users    8192 2009-02-16 19:30 .bash_history
    4 -rw-r--r--  1 pkrumins users     220 2009-01-18 21:04 .bash_logout
    ...

### Віддалений моніторинг трафіку

На компі який моніторить

    $ nc -l -p 6666 | tethereal -V -i -

На компі, з якого хочуть переглядати результати моніторингу

    $ ssh -R 6666:127.0.0.1:6666 remotemachine "tcpdump -l -p -s 0 port not 22 -w - | nc localhost 6666"
    

Оріганал [статті](http://www.catonmat.net/blog/unix-utilities-netcat/)

Також в коментарях до статті рекомендують [socat](http://www.dest-unreach.org/socat/doc/socat.html)


