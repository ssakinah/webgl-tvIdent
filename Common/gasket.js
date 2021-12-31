"use strict";

var canvas;
var gl;
var baseColors = [
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.0, 0.0)
];
var theta;
var movements=0;
var rotation_limit=2;
var rotate_count=0;
var stop = true;
var points = [];
var program;
var colors = [];
var positionLocation;
var resolutionLocation;
var matrixLocation;
var translation = [0, 0, 0];
var rotation = [degToRad(0), degToRad(0), degToRad(0)];
var scale = [1, 1, 1];
var scale_control = [0.3, 0.3, 0.3];
var process = false;
var direction = true;
var ori_speed = 500;
var current_speed = 1;
var scale_limit=1.5;
var NumTimesToSubdivide = 3;
var SubVar = (Math.pow(2, (3-NumTimesToSubdivide)));
var axis = 2;
var vertices = [
    vec3(  0.0000,  0.0000, -1.0000 ),
    vec3(  0.0000,  0.9428,  0.3333 ),
    vec3( -0.8165, -0.4714,  0.3333 ),
    vec3(  0.8165, -0.4714,  0.3333 )
];
let object ={
    x: 0,
    y: 0,
    xspeed: 1,
    yspeed: 1,
    width: ((Math.sqrt(3))/2)*700,
    height:(1.5/2)*700,
    ori_x: 0,
    ori_y:0
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }



    //---------Event List for Control---------
    document.getElementById("speed_slide").onchange = function() {
      current_speed = (ori_speed/this.value);
    }
    document.getElementById("direction_check").onclick = function () {
        direction = !direction;
    };
    document.getElementById("sub_default").checked = true;
    document.getElementById("rot_default").checked = true;
    document.getElementById("axis_default").checked = true;
    document.querySelectorAll("input[name='subdivision']").forEach((input) => {
        input.addEventListener('change', myfunction);
    });
    document.querySelectorAll("input[name='rotate']").forEach((input) => {
        input.addEventListener('change', myfunction3);
    });
    document.querySelectorAll("input[name='axis']").forEach((input) => {
        input.addEventListener('change', myfunction4);
    });
    document.getElementById("reset_speed").onclick = function() {
        document.getElementById("speed_slide").value = ori_speed;
        current_speed = ori_speed;
    }

    function applyToColorInput(source) {
        const picker = new CP(source);
        // Prevent showing native color picker pane
        source.addEventListener('click', e => e.preventDefault());
        picker.on('change', function(r, g, b) {
            // HTML5 color input does not support alpha channel
            this.source.value = this.color(r, g, b, 1);
            changecolor(this.source.value, this.source.name);
        });
    }

    document.querySelectorAll('input[type=color]').forEach(applyToColorInput);

    //--------Start and Stop Function---------
    document.getElementById("button").onclick = function(event) {
        if(process == false){
            document.getElementById("button").innerHTML = "Stop";
            settingsDisable(true);
            process=true;
            stop = false;
            rotationStep();

        }
        else {
            stop = true;
            reset();
        }
    };


    //---------Configure WebGL---------

    divideTetra( vertices[0], vertices[1], vertices[2], vertices[3],
                 NumTimesToSubdivide);
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 0 );

    // enable hidden-surface removal

    gl.enable(gl.DEPTH_TEST);

    //  Load shaders and initialize attribute buffers

    program = webglUtils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);
    gl.useProgram( program );

    // Create a buffer object, initialize it, and associate it with the
    //  associated attribute variable in our vertex shader

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var colorLocation = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( colorLocation, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( colorLocation );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    positionLocation = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( positionLocation, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( positionLocation );
    matrixLocation = gl.getUniformLocation(program, "u_matrix");
    recalibratePosition();
    drawScene();

    function drawScene() {
        // Clear the canvas.

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Compute the matrices
        var matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 0);
        matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
        matrix = m4.xRotate(matrix, rotation[0]);
        matrix = m4.yRotate(matrix, rotation[2]);
        matrix = m4.zRotate(matrix, rotation[1]);
        matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);
        matrix = m4.scale(matrix, scale_control[0], scale_control[1], scale_control[2]);
        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, matrix);
        gl.drawArrays( gl.TRIANGLES, 0, points.length );

    }

    function myfunction(event) {
        NumTimesToSubdivide = document.querySelector('input[name="subdivision"]:checked').value;
        SubVar = (Math.pow(2, (3-NumTimesToSubdivide)));
        recalibratePosition();
        points = [];
        colors = [];
        divideTetra( vertices[0], vertices[1], vertices[2], vertices[3],
                     NumTimesToSubdivide);
        drawScene();
    }

    function myfunction3() {
        rotation_limit=2;
        rotation_limit *= document.querySelector('input[name="rotate"]:checked').value;
    }

    function myfunction4() {
        axis = document.querySelector('input[name="axis"]:checked').value;
    }

    function changecolor(value, i) {

        switch (i) {
            case "color1":
                i=0;
                break;
            case "color2":
                i=1;
                break;
            case "color3":
                i=2;
                break;
        }
        hexToRgb(value, i);
        points = [];
        colors = [];
        divideTetra( vertices[0], vertices[1], vertices[2], vertices[3],
                     NumTimesToSubdivide);
        reColor();
        drawScene();
    }

    function reset() {
        process=false;
        document.getElementById("button").innerHTML = "Start";
        settingsDisable(false);
        if(document.getElementById("direction_check").checked == true) direction = false;
        else direction = true;
        points = [];
        colors = [];
        recalibratePosition();
        theta=0;
        rotate_count=0;
        myfunction3();
        translation = [0, 0, 0];
        rotation = [degToRad(0), degToRad(0), degToRad(0)];
        scale = [1, 1, 1];
        divideTetra( vertices[0], vertices[1], vertices[2], vertices[3],
                     NumTimesToSubdivide);
        drawScene();
    }

    function rotationStep(){
        if(stop == true){
            process=false;
            cancelAnimationFrame(rotation);
        }
        if(theta == 0 && rotation_limit==0){
            process=false;
            cancelAnimationFrame(rotation);
            theta=1;
        }
        if(theta <= -180 || theta >= 180){
            direction = !direction;
            rotation_limit--;
        }
        if(process){
            if(direction)rotate_count-=2;
            else rotate_count+=2;
            theta = (rotate_count/current_speed);
            rotation[axis-1] = degToRad(theta);
            drawScene();
            requestAnimationFrame(rotationStep);
        }
        else{
            process=true;
			rotateColor();
            scaling();
        }
    }
    function scaling() {
        if(stop == true){
            process=false;
            cancelAnimationFrame(scaling);
        }
        if(theta<=scale_limit && process){
            theta+=(0.01/current_speed);
            scale = [theta, theta, theta];
            drawScene();
            requestAnimationFrame(scaling);
        }
        else {
            process=false;
            cancelAnimationFrame( scaling );
            process=true;
			rotateColor();
            translate();
        }
    }
	
    function translate(){
        if(stop == true){
            process=false;
            cancelAnimationFrame(translate);
        }
			
        if(process){
            object.x+=(object.xspeed/current_speed);
            object.y+=(object.yspeed/current_speed);
            checkHitBox();
			translation=[((object.x-object.ori_x)/700)*2, 0.0, 0.0];
			movements=movements+1;
            drawScene();
            requestAnimationFrame(translate);
        }
        else{
            process=false;
            cancelAnimationFrame( translate );
        }
    }
	
    function test() {
        scale = [0.5,0.5,0.5];
        drawScene();
    }
};

var m4 = {

  projection: function(width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
       1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

};



function triangle( a, b, c, color )
{

    // add colors and vertices for one triangle
    colors.push( baseColors[color] );
    points.push( a );
    colors.push( baseColors[color] );
    points.push( b );
    colors.push( baseColors[color] );
    points.push( c );
}

function tetra( a, b, c, d )
{
    // tetrahedron with each side using
    // a different color

    triangle( a, c, b, 0 );
    triangle( a, c, d, 1 );
    triangle( a, b, d, 2 );
    triangle( b, c, d, 3 );
}

function divideTetra( a, b, c, d, count)
{
    // check for end of recursion

    if ( count === 0 ) {
        tetra( a, b, c, d );
    }

    // find midpoints of sides
    // divide four smaller tetrahedra

    else {
        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var ad = mix( a, d, 0.5 );
        var bc = mix( b, c, 0.5 );
        var bd = mix( b, d, 0.5 );
        var cd = mix( c, d, 0.5 );

        --count;

        divideTetra(  a, ab, ac, ad, count );
        divideTetra( ab,  b, bc, bd, count );
        divideTetra( ac, bc,  c, cd, count );
        divideTetra( ad, bd, cd,  d, count );
    }
}

function radToDeg(r) {
     return r * 180 / Math.PI;
}

function degToRad(d) {
    return d * Math.PI / 180;
}

function settingsDisable(bool) {
    document.getElementById("speed_slide").disabled = bool;
    document.getElementById("direction_check").disabled = bool;
    document.querySelectorAll("input[name='subdivision']").forEach((input) => {
        input.disabled = bool;
    });
    document.querySelectorAll("input[name='rotate']").forEach((input) => {
        input.disabled = bool;
    });
    document.getElementById("reset_speed").disabled = bool;
}

function checkHitBox(){
    if(object.x+(object.width) >= (canvas.width) || object.x <= 0){
        object.xspeed *= -1;
    }

    if(object.y+(object.height) >= (canvas.height) || object.y <= 0){
        object.yspeed *= -1;
    }
}

function hexToRgb(h, index) {
    var r, g, b;

    r= h[1] + h[2];
    g =h[3] + h[4];
    b =h[5] + h[6];
    var result =[0, r, g, b];

    r= parseInt(result[1], 16);
    g= parseInt(result[2], 16);
    b= parseInt(result[3], 16);

    r= parseFloat(r);
    g= parseFloat(g);
    b= parseFloat(b);

    baseColors[index] = vec3(r/255, g/255, b/255);
}

function recalibratePosition() {
    object.width = (((Math.sqrt(3))/2)*700)/SubVar;
    object.height = ((1.5/2)*700)/SubVar;
    object.x= (350-object.width/2);
    object.y= (350-(350/SubVar));
    object.ori_x = object.x;
    object.ori_y = object.y;
    object.xspeed = 1;
    object.yspeed = 1;
}

function reColor() {
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
    var colorLocation = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( colorLocation, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( colorLocation );
}

function rotateColor() {

    var temp = baseColors[0];
    baseColors[0] = baseColors[1];
    baseColors[1] = baseColors[2];
    baseColors[2] = temp;
    for (var i = 0; i < colors.length-1; i) {
        for (var j=0; j < 3; j++) {
            for (var k=0; k < 3; k++) {
                colors[i] = baseColors[(j)];
                i++;
            }
        }
    }

    reColor();
}
