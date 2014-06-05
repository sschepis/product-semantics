
var app = require('app');
var jade = require('jade');

function doSearch(term) {
    var fn = jade.compile($('#productTemplate').text());
    app.search(term,
    function(err, products) {
        $('#output').empty();
        for(var p in products.products) {
            p = products.products[p];
            $('#output').append($(fn({item:p,itemStr:JSON.stringify(p,null,4)})));
            $('#p'+ p.id)
                .data('product', p)
                .click(function(evt){
                    var data = $(this).data('product');
                    doAddTrackedItem(data.id, data);
                });
        }
    });
}

function doAddTrackedItem(id, data) {
    if(!data) data = $('#p'+id).data('tracked_item');
    if(!data) return;
    app.addToTrackingList(data, refreshTrackedItemList);
}

var refreshTrackedItemList = function(err, trackedItems) {
    if(err) return;
    var fn = jade.compile($('#trackedItemTemplate').text());
    $('#items').empty();
    for(var key in trackedItems) {
        var item = trackedItems[key];
        $('#items').append($(fn({item:item,itemStr:JSON.stringify(item,null,4)})));
        $('#i'+ item.id)
            .data('tracked_item', item)
            .click(function(){
                var data = $(this).data('tracked_item');
                doTrackedItemClicked(data.id, data);
            })
    }
};

function doTrackedItemClicked(id, data) {
    if(!data) data = $('#p'+id).data('tracked_item');
    var fn = jade.compile($('#itemDetailTemplate').text());
    $('#output').empty();
    $('#output').append($(fn({item:data,itemStr:JSON.stringify(data,null,4)})));
}

$(window).hashchange( function() {
    var hash = location.hash ? location.hash : 'lenovo x300';
    hash = hash.replace(/#/g, '');
    doSearch({ search : hash });
});

function searchP() {
    location.hash = $('#p').val();
}

$(function(){
    $(window).hashchange();
    app.refresh(refreshTrackedItemList);
});
