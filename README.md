
# find-similar-packages

find packages similar to given one. Similarity is decided based on keyword matching.

- returns a promise
- default result size is 10


```js
var findSimilar = require('find-similar-packages');
findSimilar('express').then(function (packages) {
    console.log(packages); //[ 'loopback', 'express-generator', 'koa', ...]
}).catch(function (error) {
    console.log(error);
});
```