---
layout: post
title: Збереження попереднього стану в Reactive Programming
category: hacks
tags: rx reactive rxjs rxjava
published: true
summary: Як правильно передавати стан в реактивному програмуванні
---

#### Для нетерплячих:

```javascript
var a = rx.Observable.just(42);
var b = a.map(function(i){ return i+2; }).map(function(i){ return i*17; });
rx.Observable.zip(a, b, function(a, b){ 
   return {"a":a, "b":b};
}).subscribe(function(a){ 
   console.log("A+B: "+JSON.stringify(a));
});
```

#### Tепер те ж в  ASCII-art :)

```
--A--------Ad---|-
   \      /
    b-c-d
```

#### Тепер по черзі

Створюємо початковий потік. Саме сигнали з цього потоку ми отримати в оригінальноу виді

```
var a = rx.Observable.just(42);
```

створюємо довгий потік з багатьма ланками обробки:

```
var b = a.map(function(i){ return i+2; }).map(function(i){ return i*17; });
```

поєднуємо довгий та короткий потоки

```
rx.Observable.zip(a, b, function(a, b){ 
   return {"a":a, "b":b};
})
```

[Чудові доки](http://rxmarbles.com/) по Reactive Programming без слів :)
