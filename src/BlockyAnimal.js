// Global related to UI elements
let g_globalAngle = 0;
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation=false;
let g_magentaAnimation=false;

// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    void main() {
        gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    }
`;

// Fragment shader program
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }
`;

function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return false;
    }
    gl.enable(gl.DEPTH_TEST);

    return true;
}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return false;
    }

    // Get the storage location of attributes and uniforms
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return false;
    }

    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return false;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return false;
    }

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return false;
    }    

    // Set an initial value for the model matrix
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

    return true;
}

function addActionsForHtmlUI() {
    // Button Events
    document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation=true;};
    document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation=false;};
    document.getElementById('animationMagentaOnButton').onclick = function() {g_magentaAnimation=true;};
    document.getElementById('animationMagentaOffButton').onclick = function() {g_magentaAnimation=false;};

    // Color Slider Events
    document.getElementById('magentaSlide').addEventListener("mousemove", function() { g_magentaAngle = this.value; renderAllShapes(); });
    document.getElementById('yellowSlide').addEventListener("mousemove", function() { g_yellowAngle = this.value; renderAllShapes(); });

    // Size Slider Events
    document.getElementById('angleSlide').addEventListener("mousemove", function() { g_globalAngle = this.value; renderAllShapes(); });
}

function main() {
    // Set up canvas and gl variables
    if (!setupWebGL()) {
        return;
    }

    // Set up GLSL shader programs and connect GLSL variables
    if (!connectVariablesToGLSL()) {
        return;
    }

    // Set up actions for the HTML UI elements
    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev); } };

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// Called by browser repeatedly whenever it's time
function tick() {
    // Save the current time
    g_seconds=performance.now()/1000.0-g_startTime;

    updateAnimationAngles();

    renderAllShapes();

    // Tell the browser to update again when it has time
    requestAnimationFrame(tick);
}

// Update the angles of everything if currently animated
function updateAnimationAngles() {
    if (g_yellowAnimation) {
        g_yellowAngle = (45*Math.sin(g_seconds));
    }
    if (g_magentaAnimation) {
        g_magentaAngle = (45*Math.sin(3*g_seconds));
    }
}

function renderAllShapes() {
    // Check the time at the start of this function
    var startTime = performance.now();

    // Clear both the color and depth buffer before rendering
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass the matrix to u_ModelMatrix attribute
    var globalRotMat=new Matrix4().rotate(g_globalAngle,0,1,0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Draw the body cube
    var body = new Cube();
    body.color = [1, 0, 0, 1];
    body.matrix.translate(-.25,-.75,0);
    body.matrix.scale(.5,.3,.5)
    body.render();

    // Draw a left arm
    var yellow = new Cube();
    yellow.color = [1,1,0,1];
    yellow.matrix.setTranslate(0,-.5,.003);
    yellow.matrix.rotate(-5,1,0,0);

    yellow.matrix.rotate(-g_yellowAngle,0,0,1);

    var yellowCoordinatesMat=new Matrix4(yellow.matrix);
    yellow.matrix.scale(0.25,.7,.5);
    yellow.matrix.translate(-.5,0,0);
    yellow.render();

    // Test box
    var box = new Cube();
    box.color = [1,0,1,1];
    box.matrix = yellowCoordinatesMat;
    box.matrix.translate(0,0.65,0);
    box.matrix.rotate(g_magentaAngle,0,0,1);
    box.matrix.scale(.3,.3,.3);
    box.matrix.translate(-.5,0,-0.001);
    box.render();

    // Check the time at the end of the function, and show on web page
    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration));
}

function click(ev) {
    // Handle mouse click events
    let [x, y] = convertCoordinatesEventToGL(ev);
    g_shapesList.push({ type: g_selectedType, color: g_selectedColor.slice(), size: g_selectedSize, coords: [x, y] });
    renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
    let rect = ev.target.getBoundingClientRect();
    let x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
    let y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
    return [x, y];
}

function drawTriangle3D(vertices) {
    var n = 3; // The number of vertices

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.error('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assign the buffer to the a_Position attribute
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    // Enable the attribute
    gl.enableVertexAttribArray(a_Position);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function sendTextToHTML(text) {
    document.getElementById("numdot").innerHTML = text;
}