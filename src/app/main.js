define(function(require) {
    require('css!assets/css/main');
    var $ = require('jquery');
    var app = {
        init: function() {
            require('./game');
        }
    };
    $(function() {
        app.init();
    })
});