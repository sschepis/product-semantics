browserify -r http-browserify:http -r jade -r browser-request:request -r ./js/products.js:products > js/bundle.js
