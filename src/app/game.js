define(['phaser', './dungeon', 'dat.gui'], function(Phaser, Dungeon, dat) {
    'use strict';
    var config = {
        type: Phaser.AUTO,
        width: "100%",
        height: "100%",
        backgroundColor: '#2a2a55',
        parent: 'phaser-example',
        pixelArt: true,
        roundPixels: false,
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    var game = new Phaser.Game(config);
    var layer;
    var controls;
    var activeRoom;
    var dungeon;
    var map;
    var player;
    var cursors;
    var player;
    var lastMoveTime = 0;
    var cam;

    //  Toggle this to disable the room hiding / layer scale, so you can see the extent of the map easily!
    var debug = false;

    // Tile index mapping to make the code more readable
    var TILES = {
        TOP_LEFT_WALL: 3,
        TOP_RIGHT_WALL: 4,
        BOTTOM_RIGHT_WALL: 23,
        BOTTOM_LEFT_WALL: 22,
        TOP_WALL: [
            { index: 39, weight: 4 },
            { index: 57, weight: 1 },
            { index: 58, weight: 1 },
            { index: 59, weight: 1 }
        ],
        LEFT_WALL: [
            { index: 21, weight: 4 },
            { index: 76, weight: 1 },
            { index: 95, weight: 1 },
            { index: 114, weight: 1 }
        ],
        RIGHT_WALL: [
            { index: 19, weight: 4 },
            { index: 77, weight: 1 },
            { index: 96, weight: 1 },
            { index: 115, weight: 1 }
        ],
        BOTTOM_WALL: [
            { index: 1, weight: 4 },
            { index: 78, weight: 1 },
            { index: 79, weight: 1 },
            { index: 80, weight: 1 }
        ],
        FLOOR: [
            { index: 6, weight: 20 },
            { index: 7, weight: 1 },
            { index: 8, weight: 1 },
            { index: 26, weight: 1 },
        ]
    };

    function preload() {
        // Credits! Michele "Buch" Bucelli (tilset artist) & Abram Connelly (tileset sponser)
        // https://opengameart.org/content/top-down-dungeon-tileset
        this.load.image('tiles', 'assets/buch-dungeon-tileset-extruded.png');
    }

    function create() {
        // Note: Dungeon is not a Phaser element - it's from the custom script embedded at the bottom :)
        // It generates a simple set of connected rectangular rooms that then we can turn into a tilemap

        //  2,500 tile test
        // dungeon = new Dungeon({
        //     width: 50,
        //     height: 50,
        //     rooms: {
        //         width: { min: 7, max: 15, onlyOdd: true },
        //         height: { min: 7, max: 15, onlyOdd: true }
        //     }
        // });

        //  40,000 tile test
        dungeon = new Dungeon({
            width: 200,
            height: 200,
            rooms: {
                width: { min: 7, max: 20, onlyOdd: true },
                height: { min: 7, max: 20, onlyOdd: true }
            }
        });

        //  250,000 tile test!
        // dungeon = new Dungeon({
        //     width: 500,
        //     height: 500,
        //     rooms: {
        //         width: { min: 7, max: 20, onlyOdd: true },
        //         height: { min: 7, max: 20, onlyOdd: true }
        //     }
        // });

        //  1,000,000 tile test! - Warning, takes a few seconds to generate the dungeon :)
        // dungeon = new Dungeon({
        //     width: 1000,
        //     height: 1000,
        //     rooms: {
        //         width: { min: 7, max: 20, onlyOdd: true },
        //         height: { min: 7, max: 20, onlyOdd: true }
        //     }
        // });

        // Creating a blank tilemap with dimensions matching the dungeon
        map = this.make.tilemap({ tileWidth: 16, tileHeight: 16, width: dungeon.width, height: dungeon.height });

        // addTilesetImage: function (tilesetName, key, tileWidth, tileHeight, tileMargin, tileSpacing, gid)

        var tileset = map.addTilesetImage('tiles', 'tiles', 16, 16, 1, 2);

        layer = map.createBlankDynamicLayer('Layer 1', tileset);

        if (!debug) {
            layer.setScale(3);
        }

        // Fill with black tiles
        layer.fill(20);

        // Use the array of rooms generated to place tiles in the map
        dungeon.rooms.forEach(function(room) {
            var x = room.x;
            var y = room.y;
            var w = room.width;
            var h = room.height;
            var cx = Math.floor(x + w / 2);
            var cy = Math.floor(y + h / 2);
            var left = x;
            var right = x + (w - 1);
            var top = y;
            var bottom = y + (h - 1);

            // Fill the floor with mostly clean tiles, but occasionally place a dirty tile
            // See "Weighted Randomize" example for more information on how to use weightedRandomize.
            map.weightedRandomize(x, y, w, h, TILES.FLOOR);

            // Place the room corners tiles
            map.putTileAt(TILES.TOP_LEFT_WALL, left, top);
            map.putTileAt(TILES.TOP_RIGHT_WALL, right, top);
            map.putTileAt(TILES.BOTTOM_RIGHT_WALL, right, bottom);
            map.putTileAt(TILES.BOTTOM_LEFT_WALL, left, bottom);

            // Fill the walls with mostly clean tiles, but occasionally place a dirty tile
            map.weightedRandomize(left + 1, top, w - 2, 1, TILES.TOP_WALL);
            map.weightedRandomize(left + 1, bottom, w - 2, 1, TILES.BOTTOM_WALL);
            map.weightedRandomize(left, top + 1, 1, h - 2, TILES.LEFT_WALL);
            map.weightedRandomize(right, top + 1, 1, h - 2, TILES.RIGHT_WALL);

            // Dungeons have rooms that are connected with doors. Each door has an x & y relative to the rooms location
            var doors = room.getDoorLocations();

            for (var i = 0; i < doors.length; i++) {
                map.putTileAt(6, x + doors[i].x, y + doors[i].y);
            }

            // Place some random stuff in rooms occasionally
            var rand = Math.random();
            if (rand <= 0.25) {
                layer.putTileAt(166, cx, cy); // Chest
            } else if (rand <= 0.3) {
                layer.putTileAt(81, cx, cy); // Stairs
            } else if (rand <= 0.4) {
                layer.putTileAt(167, cx, cy); // Trap door
            } else if (rand <= 0.6) {
                if (room.height >= 9) {
                    // We have room for 4 towers
                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx - 1, cy + 1);

                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx + 1, cy + 1);

                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx - 1, cy - 2);

                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx + 1, cy - 2);
                } else {
                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx - 1, cy - 1);

                    layer.putTilesAt([
                        [186],
                        [205]
                    ], cx + 1, cy - 1);
                }
            }
        });

        // Not exactly correct for the tileset since there are more possible floor tiles, but this will
        // do for the example.
        layer.setCollisionByExclusion([6, 7, 8, 26]);

        // Hide all the rooms
        if (!debug) {
            layer.forEachTile(function(tile) { tile.alpha = 0; });
        }

        // Place the player in the first room
        var playerRoom = dungeon.rooms[0];

        player = this.add.graphics({ fillStyle: { color: 0xedca40, alpha: 1 } }).fillRect(0, 0, map.tileWidth * layer.scaleX, map.tileHeight * layer.scaleY);

        player.x = map.tileToWorldX(playerRoom.x + 1);
        player.y = map.tileToWorldY(playerRoom.y + 1);

        if (!debug) {
            setRoomAlpha(playerRoom, 1); // Make the starting room visible
        }

        // Scroll to the player
        cam = this.cameras.main;

        cam.setBounds(0, 0, layer.width * layer.scaleX, layer.height * layer.scaleY);
        cam.scrollX = player.x - cam.width * 0.5;
        cam.scrollY = player.y - cam.height * 0.5;

        cursors = this.input.keyboard.createCursorKeys();

        var help = this.add.text(16, 16, 'Arrows keys to move', {
            fontSize: '18px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#ffffff',
            fill: '#000000'
        });

        help.setScrollFactor(0);

        // var gui = new dat.GUI();

        // gui.addFolder('Camera');
        // gui.add(cam, 'scrollX').listen();
        // gui.add(cam, 'scrollY').listen();
        // gui.add(cam, 'zoom', 0.1, 4).step(0.1);
        // gui.add(cam, 'rotation').step(0.01);
        // gui.add(layer, 'skipCull').listen();
        // gui.add(layer, 'cullPaddingX').step(1);
        // gui.add(layer, 'cullPaddingY').step(1);
        // gui.add(layer, 'tilesDrawn').listen();
        // gui.add(layer, 'tilesTotal').listen();
    }

    function update(time, delta) {
        updatePlayerMovement(time);

        var playerTileX = map.worldToTileX(player.x);
        var playerTileY = map.worldToTileY(player.y);

        // Another helper method from the dungeon - dungeon XY (in tiles) -> room
        var room = dungeon.getRoomAt(playerTileX, playerTileY);

        // If the player has entered a new room, make it visible and dim the last room
        if (room && activeRoom && activeRoom !== room) {
            if (!debug) {
                setRoomAlpha(room, 1);
                setRoomAlpha(activeRoom, 0.5);
            }
        }

        activeRoom = room;

        // Smooth follow the player
        var smoothFactor = 0.9;

        cam.scrollX = smoothFactor * cam.scrollX + (1 - smoothFactor) * (player.x - cam.width * 0.5);
        cam.scrollY = smoothFactor * cam.scrollY + (1 - smoothFactor) * (player.y - cam.height * 0.5);
    }

    function setRoomAlpha(room, alpha) {
        map.forEachTile(function(tile) {
            tile.alpha = alpha;
        }, this, room.x, room.y, room.width, room.height)
    }

    function isTileOpenAt(worldX, worldY) {
        // nonNull = true, don't return null for empty tiles. This means null will be returned only for
        // tiles outside of the bounds of the map.
        var tile = map.getTileAtWorldXY(worldX, worldY, true);

        if (tile && !tile.collides) {
            return true;
        } else {
            return false;
        }
    }

    function updatePlayerMovement(time) {
        var tw = map.tileWidth * layer.scaleX;
        var th = map.tileHeight * layer.scaleY;
        var repeatMoveDelay = 100;

        //tw = th = 5; repeatMoveDelay = 10;

        if (time > lastMoveTime + repeatMoveDelay) {
            if (cursors.down.isDown) {
                if (isTileOpenAt(player.x, player.y + th)) {
                    player.y += th;
                    lastMoveTime = time;
                }
            } else if (cursors.up.isDown) {
                if (isTileOpenAt(player.x, player.y - th)) {
                    player.y -= th;
                    lastMoveTime = time;
                }
            }

            if (cursors.left.isDown) {
                if (isTileOpenAt(player.x - tw, player.y)) {
                    player.x -= tw;
                    lastMoveTime = time;
                }
            } else if (cursors.right.isDown) {
                if (isTileOpenAt(player.x + tw, player.y)) {
                    player.x += tw;
                    lastMoveTime = time;
                }
            }
        }
    }
});