var productTemplate =
'div(class=\'product searchresult\', id=output.id)\n' +
'    h2= output.title\n' +
'    b= output.price\n' +
'    h2= output.upc\n' +
'    b= output.totav\n';

//'    br= output.upc\n' +
//'    br= output.totav\n';

$(window).hashchange( function() {
    var app = require('app');
    var jade = require('jade');
    var fn = jade.compile(productTemplate);
    var hash = location.hash ? location.hash : 'lenovo x300';
    hash = hash.replace(/#/g, '');
    hash = {
        search : hash
    };


});

$(function(){
    $(window).hashchange();
});

function doSearch(term) {
    app.search(term,
    function(err, products) {
        for(var p in products.products) {
            p = products.products[p];
            var tplData = {
                output:{
                    id : p.id,
                    title : p.name,
                    price : p.price,
                    upc : p.upc,
                    totav : p.total_available_qty
                }};
            $('#output').append($(fn(tplData)));
            $('#'+ p.id).data('product', tplData);
        }
        $('.searchresult').click(function(evt){
            var data = $(this).data('product');
            doAddTrackedItem(data.id, data);
        });
    });
}

function doAddTrackedItem(id, data) {
    if(!data) data = $('#'+id).data('product');
}

function doTrackedItemClicked(id) {

}

function searchP() {
    location.hash = $('#p').val();
}

function TrackedItem() {

}