'use strict'

var request = require('request'),
    Q = require('q'),
    rx = require('rx');

var initialObs = rx.Observable.just("start value");

var rndObs = initialObs.flatMap(function(i){
    return rx.Observable.from([Math.random(), Math.random()]);
}).map(function(rnd){
    console.log("rnd: "+rnd);
    return { value: rnd, fortyTwo: 42};
});


var zipObs = rx.Observable.zip(rndObs, initialObs, function(rnd, i) {
    return {rnd: rnd, initial: i};
});


zipObs.filter(function(i){

    return i.rnd.value < 0.5;

}).subscribe(function(a){
    console.log(" < 0.5: "+JSON.stringify(a));
}, function(fail){
    console.log("FAILED < 0.5: "+JSON.stringify(fail));
});


zipObs.filter(function(i){
    return i.rnd.value >= 0.5;

}).subscribe(function(a){
    console.log(" >= 0.5: "+JSON.stringify(a));
}, function(fail){
    console.log("FAILED >= 0.5: "+JSON.stringify(fail));
});