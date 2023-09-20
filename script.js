'use strict';

$(window).load(function () {
    if (!sessionStorage.getItem("isReloaded")) {
        localStorage.clear();
    }
    sessionStorage.setItem("isReloaded", true);

    var i;
    var gameTimer;
    var score = 0;
    var highscore = 0;
    var gameStarted = false;
    var mouseDown = false;
    var ctx;
    var canvas;
    var width, height;
    var random;
    var interval = 30;

    var stickSpeed = 1;      // Initial speed at which the stick grows
    var speedIncreaseRate = 0.1; // The rate at which the stick speed increases
    var maxStickSpeed = 5;   // Maximum speed limit for the stick growth
    var targetSize = 100;    // Initial target platform size
    var sizeDecreaseRate = 2; // The rate at which the target size decreases
    var minTargetSize = 30;  // Minimum size of the target

    var jumpStartTime;


    let lastTime = Date.now();  // Stores the timestamp of the last update
    let deltaTime = 0;  // The difference in time between the current frame and the last frame
    let maxJumpPower = 20;  // Example value. Adjust based on gameplay needs.



    var warning = {
        active: false,
        //message: "Warning! You're falling! Try again!",
        message: "",
        fontSize: '40px',
        font: 'Arial',
        color: 'red',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        displayDuration: 1000, // 3 seconds
        startTime: null,
        setMessage: function(msg) {
            this.message = msg;
            this.active = true;
            this.startTime = Date.now();
        }
    };
    

    var player = {
        state: 'rest', // rest or running
        pos: 'up', // up or down        
        height: 30,
        width: 20,
        x: 0,
        y: 0,
        speed: 5,
        defaultSpeed: 5,
        acceleration: 0.1,
        fallSpeed: 10,
        defaultFallSpeed: 10,
        color: 'black',
        bandColor: 'red',
        eyeColor: 'white',
        legsize: 5,
        lives: 3,
        livesDecrementedForCurrentFall: false,
        initialX: 0,
        initialY: 0,

        vx: 0,
        vy: 0,
        jumpSpeed: -15, 
        jumpForwardSpeed: 5, // Determines how fast the player moves forward during a jump
        gravity: 0.5,
        jumping: false,
        hasFallenFromJump: false,

        isCharging: false,
        chargeTime: 0,   // Time player has been charging jump
        maxChargeTime: 1000,  // Maximum time to charge (in milliseconds, adjust as needed)

        landedOnPlatform: false,
        hitBalloon: false,

        drawPlayer: function() {
            var bandY = player.y + player.height / 4;
            var eyeY = player.y + player.height / 4 + 2;
            var feetY = player.y + player.height - player.legsize;
            var mouthY = eyeY + 5;
        
            if (player.pos === 'down') {
                bandY = player.y + 3 * player.height / 4;
                eyeY = player.y + 3 * player.height / 4 - 2;
                feetY = player.y - player.legsize / 2;
                mouthY = eyeY - 5;
            }
        
            // body
            var gradient = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y + player.height);
            gradient.addColorStop(0, player.color);
            gradient.addColorStop(1, 'gray');  // Add shading
            ctx.fillStyle = gradient;
            ctx.fillRect(player.x, player.y, player.width, player.height - player.legsize);

            // Cap
            var capTop = player.y - 10; // Positioning cap above the player's head
            var capHeight = 15; // Adjust for desired height of the cap
            var capColor = '#1E90FF'; // Base color of the cap
            var brimWidth = 5; // Width of the cap's brim

            // Draw the main part of the cap (covering the head) with a rounded top for more realism
            ctx.fillStyle = capColor;
            ctx.beginPath();
            ctx.moveTo(player.x, capTop + capHeight);
            ctx.arcTo(player.x + player.width, capTop + capHeight, player.x + player.width, capTop, 10); // rounded corner top-right
            ctx.arcTo(player.x + player.width, capTop, player.x, capTop, 10); // rounded corner top-left
            ctx.arcTo(player.x, capTop + capHeight, player.x + player.width, capTop + capHeight, 10); // rounded corner bottom-left
            ctx.fill();

            // Add some shading to the cap for depth
            var gradient = ctx.createLinearGradient(player.x, capTop, player.x, capTop + capHeight);
            gradient.addColorStop(0, 'darkblue');
            gradient.addColorStop(1, capColor);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw the brim of the cap
            ctx.fillStyle = capColor;
            ctx.fillRect(player.x, capTop + capHeight, player.width, brimWidth);

            // Add some shading to the brim for depth
            gradient = ctx.createLinearGradient(player.x, capTop + capHeight, player.x, capTop + capHeight + brimWidth);
            gradient.addColorStop(0, 'darkblue');
            gradient.addColorStop(1, capColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(player.x, capTop + capHeight, player.width, brimWidth);
        
            // knot
            ctx.beginPath();
            ctx.fillStyle = player.bandColor;
            ctx.moveTo(player.x, bandY);
            ctx.lineTo(player.x - player.legsize, bandY - 2.5);
            ctx.lineTo(player.x - 2.5, bandY + 2.5);
            ctx.lineTo(player.x - player.legsize, bandY + player.legsize);
            ctx.lineTo(player.x, bandY + 2.5);
            ctx.fill();
            ctx.closePath();
        
            // eyes
            ctx.beginPath();
            ctx.fillStyle = player.eyeColor;
            ctx.arc(player.x + 3 * player.width / 4, eyeY, 2, 0, 2 * Math.PI);
            ctx.fill();
        
            // mouth
            ctx.beginPath();
            ctx.arc(player.x + 3 * player.width / 4, mouthY, 3, 0, Math.PI, false);
            ctx.stroke();
        
            // eyebrows
            ctx.beginPath();
            ctx.moveTo(player.x + 3 * player.width / 4 - 2, eyeY - 3);
            ctx.lineTo(player.x + 3 * player.width / 4 + 2, eyeY - 5);
            ctx.stroke();

            // Hands
            var handRadius = 3; // Size of the hand
            var handYOffset = player.height / 2; // Positioning the hand halfway down the body
            var handXOffsetLeft = player.x; // Positioning the left hand at the left edge of the body
            var handXOffsetRight = player.x + player.width; // Positioning the right hand at the right edge of the body

            // Left Hand
            ctx.beginPath();
            ctx.arc(handXOffsetLeft, player.y + handYOffset, handRadius, 0, 2 * Math.PI);
            ctx.fillStyle = player.color; // Assuming the hands are the same color as the player's body
            ctx.fill();
            ctx.stroke();

            // Right Hand
            ctx.beginPath();
            ctx.arc(handXOffsetRight, player.y + handYOffset, handRadius, 0, 2 * Math.PI);
            ctx.fillStyle = player.color; // Assuming the hands are the same color as the player's body
            ctx.fill();
            ctx.stroke();
        
            // feet
            ctx.beginPath();
            ctx.fillStyle = 'black';
            ctx.arc(player.x + player.legsize, feetY, player.legsize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = 'black';
            ctx.arc(player.x + player.width - player.legsize, feetY, player.legsize, 0, 2 * Math.PI);
            ctx.fill();

            // Now, add shoes to the feet
            var shoeHeight = player.legsize * 0.5; // half the size of the foot for the shoe height
            var shoeColor = "#8b4513"; // brown color for shoes, you can adjust this

            // Left shoe
            ctx.beginPath();
            ctx.fillStyle = shoeColor;
            ctx.moveTo(player.x, feetY);
            ctx.lineTo(player.x + 2 * player.legsize, feetY);
            ctx.lineTo(player.x + 2 * player.legsize, feetY + shoeHeight);
            ctx.lineTo(player.x, feetY + shoeHeight);
            ctx.closePath();
            ctx.fill();

            // Right shoe
            ctx.beginPath();
            ctx.fillStyle = shoeColor;
            ctx.moveTo(player.x + player.width - 2 * player.legsize, feetY);
            ctx.lineTo(player.x + player.width, feetY);
            ctx.lineTo(player.x + player.width, feetY + shoeHeight);
            ctx.lineTo(player.x + player.width - 2 * player.legsize, feetY + shoeHeight);
            ctx.closePath();
            ctx.fill();
        }
    }

    var stick = {
        length: 0,
        startPoint: {
            x: 0,
            y: 0
        },
        endPoint: {
            x: 0,
            y: 0
        },
        state: 'rest', // rest, drawing, inUse
        color: 'black',
        width: 3,
        unit: 10,
        angle: 270,
        fallAngleSpeed: 10,
        deafultAngleSpeed: 10
    };

    var walls = [];

    var wall = {
        currentIndex: 0,
        state: 'rest', //rest, moving
        y: 0,
        speed: 15,
        defaultSpeed: 15,
        acceleration: 3,
        height: 500,
        minWidth: 50,
        maxWidth: 100,
        minDistance: 100,
        maxDistance: 500,
        leftMargin: 500,
        color: '#8B4513',
        center: {
            width: 15,
            height: 5,
            color: 'red'
        }
    };

    var cherry = {
        size: 15,
        color: "red",
        state: 0,
        x: 0,
        y: 0,
        cherries: 0,

        drawCherry: function () {
        	var img = new Image();
        	img.src = 'img/cherry.png';

            if (cherry.state) {
                // ctx.beginPath();
                // ctx.arc(cherry.x, cherry.y, cherry.size, 0, 2 * Math.PI);
                // ctx.stroke();

                ctx.drawImage(img, cherry.x - cherry.size, cherry.y - cherry.size, cherry.size*2, cherry.size*2);

                if (cherry.x > player.x && cherry.x < player.x + player.width && player.pos === 'down') {
                    cherry.state = 0;
                    cherry.cherries++;
                }


            }
        }
    }

    var balloons = [];

    var balloon = {
        x: 50,
        y: height - 50, // assuming height is the canvas's height
        speed: 1,
        color: 'red',
        radius: 20,
        generate: function() {
            this.x = random(50, width - 50); // for a random horizontal position
            this.y = height - this.radius; // start at the bottom considering its radius
        },
        move: function() {
            this.y -= this.speed; // move the balloon upwards
        },
        draw: function() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.stroke();

            // Draw the shiny spot
            var shineX = this.x - this.radius * 0.2;  // adjust as needed
            var shineY = this.y - this.radius * 0.2;  // adjust as needed
            var shineRadius = this.radius * 0.3;      // adjust as needed
            ctx.beginPath();
            ctx.arc(shineX, shineY, shineRadius, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';  // semi-transparent white
            ctx.fill();

            // Draw the string
            var stringStartX = this.x;
            var stringStartY = this.y + this.radius;  // starting from the bottom of the balloon
            var stringEndX = this.x - 10;  // adjust as needed for the end point of the string
            var stringEndY = this.y + this.radius + 100;  // adjust as needed for the length of the string
            
            var control1X = this.x + 20;  // adjust for the curvature
            var control1Y = this.y + this.radius + 30;  // adjust for the curvature
            
            var control2X = this.x - 20;  // adjust for the curvature
            var control2Y = this.y + this.radius + 70;  // adjust for the curvature

            ctx.beginPath();
            ctx.moveTo(stringStartX, stringStartY);
            ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, stringEndX, stringEndY);
            ctx.stroke();
        }
    };

    function loadGameData() {
        if (localStorage.getItem('score')) {
            score = parseInt(localStorage.getItem('score'));
        }
    
        if (localStorage.getItem('lives')) {
            player.lives = parseInt(localStorage.getItem('lives'));
        }
    
        if (localStorage.getItem('cherries')) {
            cherry.cherries = parseInt(localStorage.getItem('cherries'));
        }

        /*f (localStorage.getItem('highscore')) {
            highscore = parseInt(localStorage.getItem('highscore'));
        }*/
    }

    function updateAndDisplayBestScore() {
        let highscore = parseInt(localStorage.getItem('highscore') || 0);
        
        if (score > highscore) {
            highscore = score;
            localStorage.setItem('highscore', highscore);
        }
        
        // Update the display element for the best score
        // Assuming you have an HTML element with id="bestScore" to display it
        document.getElementById('highscore').textContent = "Best Score: " + highscore;
    }

    loadGameData();
    updateAndDisplayBestScore();
    

    function start() {
        setCanvas();
        setDefault();

        gameTimer = setInterval(update, interval);
        gameStarted = true;
    }

    setCanvas();
    setDefault();
    homePage();

    function setDefault() {
        // set default values
        if(score==0){
            score=0;
        }
            
        if(cherry.cherries==0){
            cherry.cherries = 0;
        }
        //score = 0;
        //cherry.cherries = 0;
        walls = [];
        wall.currentIndex = 0;
        player.state = 'rest';
        stick.state = 'rest';
        wall.state = 'rest';
        cherry.state = 0;
        player.pos = 'up';
        wall.maxDistance = height/2;
        wall.leftMargin = width/2 - wall.maxWidth;
        wall.y = height / 1.5;
        cherry.y = wall.y + 2 * cherry.size;

        generateWall();

        player.x = walls[0].x + walls[0].width - player.width - 5;
        player.y = wall.y - player.height;


        ctx.clearRect(0, 0, width, height);
        drawWalls();
        player.drawPlayer();
        drawScore();
        drawLives();

        // hide it initially
        $("#perfect").fadeOut(1);
        $("#deathBox").fadeOut(1);
        $("#restart").fadeOut(1);
    }

    function setCanvas() {
        canvas = $("#canvas")[0];
        ctx = canvas.getContext('2d');

        width = $(window).width();
        height = $(window).height();
        canvas.width = width;
        canvas.height = height;

        $("#start").css("left", width / 2 - parseInt($("#start").css('width')) / 2);
        $("#start").css("top", height / 2 - parseInt($("#start").css('height')) / 2);

        $("#title").css("left", width / 2 - parseInt($("#title").css('width')) / 2);



        $("#deathBox").css("left", width / 2 - parseInt($("#deathBox").css('width')) / 2);
        $("#deathBox").css("top", height / 2 - parseInt($("#deathBox").css('height')) / 2);

        $("#perfect").css("left", width / 2 - parseInt($("#perfect").css('width')) / 2);
        $("#perfect").css("top", height / 2 - parseInt($("#perfect").css('height')) / 2);

    }

    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && !player.jumping && !player.isCharging) {
            player.isCharging = true;
            player.chargeTime = 0;  // Reset charge time
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.code === 'Space' && player.isCharging) {
            player.isCharging = false;
            const jumpPower = mapChargeToPower(player.chargeTime);
            initiateJump(jumpPower);
        }
    });

    function mapChargeToPower(chargeTime) {
        let fraction = chargeTime / player.maxChargeTime;
        let power = fraction * maxJumpPower;
        return Math.min(power, maxJumpPower);
    }
    

    function initiateJump(power) {
        player.vy = -power;         // Upward vertical velocity
        player.vx = power * 0.3;   // Horizontal velocity. Adjust the multiplier for desired distance
        player.jumping = true;
    }
    
    
    function update() {

        ctx.clearRect(0, 0, width, height);

        drawWalls();
        cherry.drawCherry();
        player.drawPlayer();
        drawScore();
        drawLives();

        // Balloon
        if (random(0, 180) < 2) { // 2% chance every frame to generate a balloon
            var newBalloon = Object.create(balloon);
            newBalloon.generate();
            balloons.push(newBalloon);
        }

        for (var i = 0; i < balloons.length; i++) {
            balloons[i].y -= balloons[i].speed;
            balloons[i].draw();

            if (balloons[i].y + balloons[i].radius < 0) {
                balloons.splice(i, 1);
                i--;
            }
        }

        function generateBalloon() {
            var newBalloon = Object.create(balloon); // create a new balloon based on the balloon prototype
            newBalloon.generate(); // set its properties
            balloons.push(newBalloon); // add it to the balloons array
        }

        if (player.isCharging) {
            let now = Date.now();  // Get the current time
            deltaTime = now - lastTime;  // Calculate the time difference
            lastTime = now;  // Set lastTime for the next loop
            player.chargeTime += deltaTime;  // Assuming you have deltaTime in milliseconds

            if (player.chargeTime > player.maxChargeTime) {
                player.chargeTime = player.maxChargeTime;
            }
        }

        if (player.jumping) {
            player.vy += player.gravity;
            player.y += player.vy;     
            player.x += player.vx;

            let rightWall = walls[wall.currentIndex + 1];

            if (player.x + player.width >= rightWall.x && player.x <= rightWall.x + rightWall.width) { 
                if (player.y <= rightWall.height && player.vy > 0) {
                    player.y = rightWall.height;
                    player.vy = 0;
                    player.vx = 0;
                    player.jumping = false;
                    player.landedOnPlatform = true;
                    player.state = 'rest';
                }
            } else {
                player.landedOnPlatform = false;
            }
        
            // Ground check
            if (player.y >= $(window).height()) {
                if(!player.landedOnPlatform) {
                    player.lives -= 1;
                    warning.setMessage("Jump too far");
                }

                player.y = $(window).height();
                player.vy = 0;
                player.vx = 0;
                //player.jumping = false;

                let leftWall = walls[wall.currentIndex];  // Assuming the leftmost wall is the first in your array.
                player.x = leftWall.x+ leftWall.width - player.width - 5;
                player.y = leftWall.y-player.height;
                player.state = 'rest'
                player.jumping = false;
            }
            
        }
        

        if (stick.state === 'drawing' || stick.state === 'inUse' || stick.state === 'falling') {

            if (stick.state === 'drawing') {

                stick.startPoint = {
                    x: walls[wall.currentIndex].x + walls[wall.currentIndex].width,
                    y: walls[wall.currentIndex].y,
                };

                stick.endPoint = {
                    x: walls[wall.currentIndex].x + walls[wall.currentIndex].width,
                    y: walls[wall.currentIndex].y - stick.length
                }

                stick.length += stick.unit;

                ctx.beginPath();
                ctx.strokeStyle = stick.color;
                ctx.lineWidth = stick.width;
                ctx.moveTo(stick.startPoint.x, stick.startPoint.y);
                ctx.lineTo(stick.endPoint.x, stick.endPoint.y);
                ctx.stroke();
            }

            if (stick.state === 'inUse') {
                ctx.beginPath();
                ctx.strokeStyle = stick.color;
                ctx.lineWidth = stick.width;
                ctx.moveTo(stick.startPoint.x, stick.startPoint.y);
                ctx.lineTo(stick.endPoint.x, stick.endPoint.y);
                ctx.stroke();

                for (var i = 0; i < balloons.length; i++) {
                    var dist = Math.sqrt((player.x - balloons[i].x) ** 2 + (player.y - balloons[i].y) ** 2);
                    if (dist < player.width/2 + balloons[i].radius) {
                        player.hitBalloon = true;  
                        player.livesDecrementedForCurrentFall=true;
                        
                        if(player.hitBalloon){
                            balloons.splice(i, 1);  // remove the collided balloon
                            player.lives -= 1;      // decrement the player's lives
                            warning.setMessage("Watch out for balloons!");  // set a warning message
                            player.hitBalloon = false;  // Reset it back to false after the logi
                            player.livesDecrementedForCurrentFall=false;
                            i--;  // Decrement the loop counter since we've removed an element from the balloons array
                        }
                    }
                }
            }

            if (stick.state === 'falling') {
                if (stick.angle <= 360) {

                    interval = 10;
                    ctx.beginPath();
                    lineToAngle(ctx, stick.startPoint.x, stick.startPoint.y, stick.length, stick.angle);
                    ctx.stroke();
                    stick.angle += stick.fallAngleSpeed;
                    stick.fallAngleSpeed++;
                } else {
                    stick.state = 'inUse';
                    player.state = 'running';
                    interval = 30;
                    stick.fallAngleSpeed = stick.deafultAngleSpeed;
                }
            }
        }

        if (player.state === 'running') {

            // if player hasn't reached the end of stick
            if (player.x + player.width < stick.endPoint.x && stick.state === 'inUse') {
                player.x += player.speed;
                player.speed += player.acceleration;
            } else {
                player.state = 'rest';
                player.speed = player.defaultSpeed;
                player.x -= player.speed / 2;

                // check if  player is dead or alive
                if (stick.endPoint.x > walls[wall.currentIndex + 1].x && stick.endPoint.x < walls[wall.currentIndex + 1].x + walls[wall.currentIndex + 1].width && player.pos === 'up') {

                    //player is alive
                    wall.state = 'moving'; // move the walls leftwards
                    wall.currentIndex++;

                    if (random(1, 100) % 2 === 0) {
                        cherry.state = 1;
                        cherry.x = random(walls[wall.currentIndex].x + walls[wall.currentIndex].width + 2 * cherry.size, walls[wall.currentIndex + 1].x - 2 * cherry.size);
                    }

                    stick.state = 'rest';
                    //console.log('alive');
                    score++; //add score
                } else {
                    //player is dead
                    //console.log('dead');
                    player.state = 'falling';
                }
            }
        }

        if (wall.state === 'moving') {

            /*if (Math.random() <= 0.1) {
                cherry.state = 1;
                cherry.x = random(walls[wall.currentIndex].x + walls[wall.currentIndex].width + 2 * cherry.size, walls[wall.currentIndex + 1].x - 2 * cherry.size);
                cherry.y = random(walls[wall.currentIndex].y + 0.5*player.height, walls[wall.currentIndex].y - 0.5*player.height);
            }

            if(cherry.state){
                console.log("Player Position:", player.x, player.y);
                console.log("Cherry Position:", cherry.x, cherry.y);

                // Check for cherry collision while running
                var cherryDist = Math.sqrt((player.x - cherry.x) ** 2 + (player.y - cherry.y) ** 2);
                var cherryDist = Math.sqrt((player.x - cherry.x) ** 2 + (player.y - cherry.y) ** 2);

                if (cherryDist <player.width) {
                    console.log("Cherry collected!");
                    player.lives += 1;           // increment the player's lives
                    cherry.state = 0;            // set cherry state to inactive
                    cherry.cherries++;           // increment the cherries count
                    console.log("Player gained a life! Total lives:", player.lives);
                }
            }*/

            // move all the walls left
            if (walls[wall.currentIndex].x > wall.leftMargin) {
                for (i = 0; i < walls.length; i++) {
                    walls[i].x -= wall.speed;
                }

                player.x -= wall.speed;
                cherry.x -= wall.speed;

                wall.speed += wall.acceleration;

            } else {
                wall.state = 'rest';
                stick.state = 'rest';
                wall.speed = wall.defaultSpeed;
            }
        }

        if (player.state === 'falling') {
            player.initial = walls[wall.currentIndex]; 

            //console.log(player.landedOnPlatform);
            //console.log(player.hitBalloon);
            //console.log(player.livesDecrementedForCurrentFall);

            if(player.landedOnPlatform==false && player.hitBalloon==false){
                if(player.livesDecrementedForCurrentFall==false){
                    if(player.lives>=0){
                        player.lives -= 1;
                        warning.setMessage("You lost a life!");
                        player.livesDecrementedForCurrentFall=true;
                    }
                    else{
                        player.lives=0;
                    }
                }
            }
            
            
            for (var i = 0; i < balloons.length; i++) {
                var dist = Math.sqrt((player.x - balloons[i].x) ** 2 + (player.y - balloons[i].y) ** 2);
                if (dist < player.height/2 + balloons[i].radius) {
                        
                    balloons.splice(i, 1);  // remove the collided balloon
                    i--;
                }
            }
            
            // Bounce back from the top of the canvas
            if (player.y - player.height/2 <= 0) {
                player.fallSpeed = Math.abs(player.fallSpeed); // bounce back down
            }
            
            // Update player's position and speed
            player.y += player.fallSpeed;
            player.fallSpeed += player.acceleration;
            
            // Handle player reaching the bottom of the canvas
            if (player.y + player.height/2 >= height) {
                if(player.lives > 0) {
                    player.x = player.initial.x+ player.initial.width - player.width - 5;
                    player.y = player.initial.y-player.height;
                    player.state = 'rest';
                    stick.state = 'rest';
                    player.livesDecrementedForCurrentFall=false;
                    player.fallSpeed = player.defaultFallSpeed;  
                    
                } else {
                    stopGame();
                    player.fallSpeed = player.defaultFallSpeed;
                    player.livesDecrementedForCurrentFall=false;
                    player.hitBalloon=false;
                    player.lives = 3;  
                    score=0;
                    cherry.cherries=0;
                    alert("Game Over!");
                }
            }

             
        }

        if (warning.active) {
            // Draw semi-transparent background for the warning
            ctx.fillStyle = warning.backgroundColor;
            ctx.fillRect(0, 0, width, height);
        
            // Draw the warning message
            ctx.font = warning.fontSize + ' ' + warning.font;
            ctx.fillStyle = warning.color;
            var textWidth = ctx.measureText(warning.message).width;
            ctx.fillText(warning.message, (width - textWidth) / 2, height / 2);
        }
        
        if (warning.active && Date.now() - warning.startTime > warning.displayDuration) {
            warning.active = false;
        }

        saveGameData();

    }

    function drawWalls() {

        // draw only two walls
        for (i = 0; i < 2; i++) {
            ctx.fillStyle = wall.color;
            ctx.fillRect(walls[i + wall.currentIndex].x, walls[i + wall.currentIndex].y, walls[i + wall.currentIndex].width, wall.height);

            ctx.fillStyle = wall.center.color;
            ctx.fillRect(walls[i + wall.currentIndex].x + walls[i + wall.currentIndex].width / 2 - wall.center.width / 2, wall.y, wall.center.width, wall.center.height);

        }
    }

    function drawLives() {
        ctx.fillStyle = "black";
        ctx.font = "24px Arial";
        ctx.fillText("Lives: " + player.lives, 40, 110);  
    }

    function drawScore() {
        ctx.fillStyle = 'black';
        ctx.font = "24px Arial";
        ctx.fillText("Score  : " + score, 40, 50);
        ctx.fillText("Highest Score : " + highscore, 40, 80);
        //ctx.fillText("Cherry : " + cherry.cherries, 40, 110);
    }

    function generateWall() {
        walls.push({
            x: wall.leftMargin,
            y: wall.y,
            width: random(wall.minWidth, wall.maxWidth),
            distance: 0,
        });

        for (i = 1; i < 1000; i++) {

            var distance = random(wall.minDistance, wall.maxDistance);
            walls.push({

                distance: distance,
                x: walls[i - 1].x + walls[i - 1].width + distance,
                y: wall.y,
                width: random(wall.minWidth, wall.maxWidth),

            });
        }

    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function saveGameData() {
        localStorage.setItem('score', score);
        localStorage.setItem('lives', player.lives);
        localStorage.setItem('cherries', cherry.cherries);
        localStorage.setItem('highscore', highscore);
    }
    

    function stopGame() {
        clearInterval(gameTimer);
        death();
    }

    function startGame() {
        start();
        $("#start").css('visibility', 'hidden');
        $("#title").css('visibility', 'hidden');
    }

    function homePage() {
        setDefault();
        gameStarted = false;
        $("#start").css('visibility', 'visible');
        $("#title").css('visibility', 'visible');
        $("#deathBox").fadeOut(1);
        $("#restart").fadeOut(1);
    }

    function death() {
        var fadeSpeed = 200;

        $("#deathBox").fadeIn(fadeSpeed);
        $("#restart").fadeIn(fadeSpeed);

        $("#score").text("Score : " + score);
        if (score > highscore) highscore = score;
        $("#highscore").text("Highscore : " + highscore);
        $("#lives").text("Lives : " + 0);
    }

    $("#canvas").on('mousedown touchstart', function () {
        if (gameStarted) {

            if (player.state === 'rest') {
                stick.length = 0;
                stick.state = 'drawing';
            } else if (player.state === 'running') {
                if (player.pos === 'up') {
                    player.y += player.height + player.legsize;
                    player.pos = 'down';
                } else {
                    player.y -= player.height + player.legsize;
                    player.pos = 'up';
                }
            }


        }

    });

    $("#canvas").on('mouseup touchend', function () {

        if (stick.state === 'drawing') {
            stick.state = 'falling';

            stick.endPoint = {
                x: stick.startPoint.x + stick.length,
                y: stick.startPoint.y,
            }

            stick.angle = 270;

            //check perfect
            if (stick.endPoint.x > walls[wall.currentIndex + 1].x + walls[wall.currentIndex + 1].width / 2 - wall.center.width / 2 && stick.endPoint.x < walls[wall.currentIndex + 1].x + walls[wall.currentIndex + 1].width / 2 + wall.center.width / 2) {
                score += 10; // give 9 points on perfect
                $("#perfect").fadeIn(100, function () {
                    $("#perfect").fadeOut(2000);
                });
            }
        }
    });

    $("#canvas").on('contextmenu', function (e) {
        e.preventDefault();  // This will prevent the default context menu from showing up
    });

    $(".start").on('click touchstart', function () {
        startGame();
    });

    $("#home").on('click touchstart', function () {
        homePage();
    });

    function lineToAngle(ctx, x1, y1, length, angle) {
        angle *= Math.PI / 180;

        var x2 = x1 + length * Math.cos(angle),
            y2 = y1 + length * Math.sin(angle);

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        return {
            x: x2,
            y: y2
        };
    }

    // Additional function to reset the game
    function resetGame() {
        stickSpeed = 1;
        setDefault();
        homePage();
    }

});

