const GREEN = "#eebb33"
const BLUE = "#3077a3"

//=========================================================
//===================== CANVAS SET-UP =====================
//#region canvas_setup
const canvas = document.querySelector("canvas");
window.scrollTo({ top: 0, behavior: "auto" });
document.body.style.overflow = "hidden";

// internal canvas space dimenesions
const canvasDims = { width: 740, height: 1200 };
canvas.width = canvasDims.width;
canvas.height = canvasDims.height;

// - 2d context
const ctx = canvas.getContext("2d");
//#endregion

//=========================================================
//======================== UTILITY ========================
//#region utility
// dynamic screen fit
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        const later = function () {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function resizeCanvas() {
    // Get dimensions of the window
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    // Account for any UI elements that reduce available space
    //let navbarHeight = document.querySelector('.navbar').offsetHeight;
    let navbarHeight = 100;
    let topOffset = navbarHeight;
    let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth + 20;

    // Calculate available canvas dimensions
    let availableWidth = windowWidth - scrollbarWidth;
    let availableHeight = windowHeight - topOffset;

    // Calculate aspect ratio of the canvas
    let aspectRatio = canvasDims.width / canvasDims.height;

    // Calculate dimensions of the canvas
    let canvasWidth = availableWidth;
    let canvasHeight = availableWidth / aspectRatio;

    // If canvas height is too big for the window, adjust canvas dimensions again
    if (canvasHeight > availableHeight) {
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * aspectRatio;
    }

    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Set scale for drawing context
    let scaleX = canvasWidth / canvasDims.width;
    let scaleY = canvasHeight / canvasDims.height;
    ctx.scale(scaleX, scaleY);
}
window.addEventListener("resize", debounce(resizeCanvas, 250));

function lerp(startValue, endValue, t) {
    return startValue + (endValue - startValue) * t;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function screenToWorldSpace(x, y) {
    // screen space 0 to 1 on width and height
    // world space = canvas space
    const xWorld = lerp(0, canvasDims.width, x);
    const yWorld = lerp(0, canvasDims.height, y);

    return [xWorld, yWorld];
}
//#endregion

//========================================================
//=================== INPUT MANAGEMENT ===================
//#region input_management
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvasDims.width / rect.width;
    var scaleY = canvasDims.height / rect.height;

    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}
canvas.addEventListener("mousemove", (e) => {
    GLOBALS.mousePosition = getMousePos(canvas, e);
})
canvas.addEventListener("click", (e) => {
    switch (e.button) {
        case 0:
            for (const ui of UI_FLOAT) {
                if (ui.isZoomed) {
                    ui.onClick();
                }
            }
            if (gameIsPaused) {
                return;
            }
            for (const ui of UI) {
                if (ui.isZoomed) {
                    ui.onClick();
                }
            }
            break;
        default:
            break;
    }
});
//#endregion

//========================================================
//================== RENDERING PIPELINE ==================
//#region rendering_pipeline

//----------------------------------------------------
//------------------ OBJECT SPRITES ------------------
//#region object sprites
export class UIButton {
    constructor(coords, dims, zDims, onClickFunction, text = "", color = GREEN) {
        this.anchor = { x: coords[0], y: coords[1] };
        this.offset = { x: 0, y: 0 };
        this.originalDims = { w: dims[0], h: dims[1] };
        this.currentDims = { w: dims[0], h: dims[1] };
        this.zoomedDims = { w: zDims[0], h: zDims[1] }
        this.isZoomed = false;
        this.text = text;

        this.zoomInAnimRunning = false;
        this.zoomOutAnimRunning = false;

        this.AnimCounter = { zoomIn: 0, zoomOut: 0 };

        this.onClickFunction = onClickFunction;
        this.extraData = windowCount++;

        this.color = color;
    }

    resetColor(color = "#f49d37") {
        this.color = color;
    }

    //animations
    zoomInAnim(speed = 20) {
        if (this.AnimCounter.zoomIn < 1) {
            this.currentDims.w = lerp(this.originalDims.w, this.zoomedDims.w, this.AnimCounter.zoomIn);
            this.currentDims.h = lerp(this.originalDims.h, this.zoomedDims.h, this.AnimCounter.zoomIn);
            this.offset.x = (this.originalDims.w - this.currentDims.w) / 2;
            this.offset.y = (this.originalDims.h - this.currentDims.h) / 2;
            this.AnimCounter.zoomIn += speed * deltaTime.get('delta');
        } else {
            this.AnimCounter.zoomIn = 0;
            this.zoomInAnimRunning = false;
        }
    }

    zoomOutAnim(speed = 20) {
        if (this.AnimCounter.zoomOut <= 1) {
            this.currentDims.w = lerp(this.zoomedDims.w, this.originalDims.w, this.AnimCounter.zoomOut);
            this.currentDims.h = lerp(this.zoomedDims.h, this.originalDims.h, this.AnimCounter.zoomOut);
            this.offset.y = (this.originalDims.h - this.currentDims.h) / 2;
            this.offset.x = (this.originalDims.w - this.currentDims.w) / 2;
            this.AnimCounter.zoomOut += speed * deltaTime.get('delta');
        } else {
            this.AnimCounter.zoomOut = 0;
            this.zoomOutAnimRunning = false;
        }
    }

    onClick() {
        if (!updateLimiter) {
            this.onClickFunction(this.extraData);
            updateLimiter = true;
        }
    }

    // object management
    update() {
        // hovering over the button
        var xBound = GLOBALS.mousePosition.x >= this.anchor.x + this.offset.x && GLOBALS.mousePosition.x <= this.anchor.x + this.offset.x + this.currentDims.w;
        var yBound = GLOBALS.mousePosition.y >= this.anchor.y + this.offset.y && GLOBALS.mousePosition.y <= this.anchor.y + this.offset.y + this.currentDims.h;
        if (xBound && yBound) {
            if (!this.zoomInAnimRunning && !this.isZoomed) {
                this.isZoomed = true;
                this.zoomInAnimRunning = true;
            }
        } else if (this.isZoomed) {
            this.isZoomed = false;
            this.zoomOutAnimRunning = true;
        }
    }
    render() {
        //update behaviour
        this.update();
        //run animations
        if (this.zoomInAnimRunning) {
            this.zoomInAnim();
        }
        if (this.zoomOutAnimRunning) {
            this.zoomOutAnim();
        }

        //draw sprite to canvas
        var x = this.anchor.x + this.offset.x;
        var y = this.anchor.y + this.offset.y;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(x, y, this.currentDims.w, this.currentDims.h, 10);
        ctx.fill();
        ctx.font = "30px 'Courier new'";
        ctx.fillStyle = "black";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, x + this.currentDims.w / 2, y + this.currentDims.h / 2);
    }
}

class UIText {
    constructor(coords, fontSize, font, color, text, styling = "", alignBase = "top", align = "left") {
        this.coords = { x: coords[0], y: coords[1] };
        this.fontSize = fontSize;
        this.font = font;
        this.color = color;
        this.text = text;
        this.styling = styling;
        this.alignBase = alignBase;
        this.align = align;
    }
    render() {
        ctx.font = this.styling + this.fontSize + "px" + this.font;
        ctx.fillStyle = this.color;
        ctx.textBaseline = this.alignBase;
        ctx.textAlign = this.align;
        ctx.fillText(this.text, this.coords.x, this.coords.y);
    }

    resetText(text) {
        this.text = text;
    }
}

export class UIRect {
    constructor(coords, dims, color, cornerRadii = 10) {
        this.anchor = { x: coords[0], y: coords[1] };
        this.dims = { w: dims[0], h: dims[1] };
        this.color = color;
        this.radii = cornerRadii;
    }
    render() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(this.anchor.x, this.anchor.y, this.dims.w, this.dims.h, this.radii);
        ctx.fill();
    }

    resetwidth(width) {
        this.dims.w = width;
    }
}
//#endregion

//-----------------------------------------------------
//------------------ FRAME RENDERING ------------------
//#region frame rendering
const GLOBALS = {
    mousePosition: { x: 0, y: 0 },
    screenSize: { width: 0, height: 0 },
    isMusicPlaying: false
};

const BUILDINGS = [];
const UI = [];
console.log(UI)
const UI_FLOAT = [];
// renders background elements
const BACKGROUND_ELEMS = [];

function renderBackground() {
    for (let elem of BACKGROUND_ELEMS) {
        elem.render();
    }
}

// renders prop objects from PROPS
function renderProps() {
    const renderOrder = [];
    const numBuild = BUILDINGS.length;
    for(let i = 0; i < numBuild; i++) {
        const building = BUILDINGS[i];
        renderOrder.push(building);
    }
    for (let card of renderOrder) {
        card.render();
    }
    const numUI = UI.length;
    for (let i = 0; i < numUI; i++) {
        UI[i].render();
    }
}

function renderFloatUI() {
    for (let elem of UI_FLOAT) {
        elem.render();
    }
}

const deltaTime = new Map([
    ['now', 0],
    ['delta', 0],
    ['then', 0]
]);

function setDelta() {
    deltaTime.set('then', deltaTime.get('now'));
    deltaTime.set('now', Date.now());
    deltaTime.set('delta', (deltaTime.get('now') - deltaTime.get('then')) / 1000);
}

//#endregion

//#endregion

//========================================================
//====================== GAME LOGIC ======================
//#region game logic

import {logicUpdate, start, startScene, clickWindow, windowAmount, windowStates, difficulty, finish} from "./logic.js";

var windowCount = -1;
var currentScene;

export const SCENES = {
    main_menu: {
        UI:{
            sprites: [],
            buttons: [
                new UIButton(
                    screenToWorldSpace(0.3, 0.2), screenToWorldSpace(0.4, 0.2), screenToWorldSpace(0.42, 0.22),
                    () => {
                        currentScene = "game"
                        setupScene();
                        if (!GLOBALS.isMusicPlaying) {
                            playTracks();
                            GLOBALS.isMusicPlaying = true;
                        }
                    },
                    "Start the game"
                ),
                new UIButton(
                    screenToWorldSpace(0.345, 0.5), screenToWorldSpace(0.31, 0.1), screenToWorldSpace(0.32, 0.11),
                    () => {
                        currentScene = "tutorial"
                        setupScene();
                    },
                    "INSTRUCTIONS"
                ),
            ],
            text: [],
        },
        Background: [new UIRect([0, 0], [canvasDims.width, canvasDims.height],"#293e55ff" , 0)]
    },

    settings_menu: {
        UI:{
            sprites: [],
            buttons: [],
            text: []
        },
        Background: [new UIRect([0, 0], [canvasDims.width, canvasDims.height], BLUE, 0)]
    },

    tutorial: {
        UI:{
            buttons: [
                new UIButton(
                    screenToWorldSpace(0.4, 0.71), screenToWorldSpace(0.2, 0.1), screenToWorldSpace(0.21, 0.11),
                    () => {
                        currentScene = "main_menu"
                        setupScene();
                    },
                    "Back"
                ),
            ],
            text: [
                new UIText(
                    screenToWorldSpace(0.5, 0.22), "62", "'Courier new'", "white", "⊣ INSTRUCTIONS ⊢",
                    undefined, undefined, "center"
                ),
                // tutorial text
                new UIText(
                    screenToWorldSpace(0.17, 0.3), "30", "'Courier new'", "white", 
                    "YOU are the new 'Light", undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.325), "30", "'Courier new'", "white", 
                    "Switch Manager' for a", undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.35), "30", "'Courier new'", "white", 
                    "series of buildings...", undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.4), "30", "'Courier new'", "white", 
                    "However, these buildings", undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.425), "30", "'Courier new'", "white", 
                    "have been found to have a", undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.45), "30", "'Courier new'", "white", 
                    "rediculous carbon footprint",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.475), "30", "'Courier new'", "white", 
                    "when the lights are left ",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.5), "30", "'Courier new'", "white", 
                    "on, the people using the",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.525), "30", "'Courier new'", "white", 
                    "building have no clue as to",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.55), "30", "'Courier new'", "white", 
                    "this fact and as such leave",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.575), "30", "'Courier new'", "white", 
                    "lights on all the time.",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.6), "30", "'Courier new'", "white", 
                    "Your job, nay, your DUTY is",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.625), "30", "'Courier new'", "white", 
                    "to switch off all the",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.65), "30", "'Courier new'", "white", 
                    "lights before your carbon",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.675), "30", "'Courier new'", "white", 
                    "footprint spirals out of",
                    undefined, undefined, "left"
                ),
                new UIText(
                    screenToWorldSpace(0.17, 0.7), "30", "'Courier new'", "white", 
                    "control!",
                    undefined, undefined, "left"
                ),
            ],
            sprites: [
                new UIRect(screenToWorldSpace(0.15, 0.175), screenToWorldSpace(0.7, 0.65), BLUE, 10)
            ]
        },
        Background: [new UIRect([0,0], [canvasDims.width, canvasDims.height], "#293e55ff", 0)]
    },

    game: {
        UI: {
            sprites: [
                // BUILDINGS
                new UIRect(screenToWorldSpace(0, 0.43), screenToWorldSpace(0.26, 1), "#000000"),
                new UIRect(screenToWorldSpace(0.26, 0.63), screenToWorldSpace(0.11, 1), "#000000"),
                new UIRect(screenToWorldSpace(0.37, 0.33), screenToWorldSpace(0.37, 1), "#000000"),
                new UIRect(screenToWorldSpace(0.74, 0.43), screenToWorldSpace(0.27, 1), "#000000"),

                // ENERGY METER
                new UIRect(screenToWorldSpace(0.3, 0.02), screenToWorldSpace(0.4, 0.05), "#eeeeee"),
                new UIRect(screenToWorldSpace(0.3, 0.019), screenToWorldSpace(0, 0.052), "#bb393e"),

            ],

            buttons: [
                new UIButton(
                    screenToWorldSpace(0.02, 0.02), screenToWorldSpace(0.18, 0.08), screenToWorldSpace(0.19, 0.09),
                    () => {
                        if (!gameIsPaused) {
                            gameIsPaused = true;
                            setupScene();
                        }
                    },
                    "pause"),

                // BUILDING 1
                new UIButton(screenToWorldSpace(0.02, 0.48), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.14, 0.48), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.02, 0.575), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.14, 0.575), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.02, 0.67), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.14, 0.67), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.02, 0.765), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.14, 0.765), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.02, 0.86), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.14, 0.86), screenToWorldSpace(0.1, 0.07), screenToWorldSpace(0.1, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                

                // BUILDING 2
                new UIButton(screenToWorldSpace(0.27, 0.68), screenToWorldSpace(0.09, 0.07), screenToWorldSpace(0.09, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.27, 0.77), screenToWorldSpace(0.09, 0.07), screenToWorldSpace(0.09, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.27, 0.86), screenToWorldSpace(0.09, 0.07), screenToWorldSpace(0.09, 0.07), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),

                // BUILDING 3
                new UIButton(screenToWorldSpace(0.4, 0.36), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.36), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.36), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.4, 0.46), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.46), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.46), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.4, 0.56), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.56), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.56), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.4, 0.66), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.66), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.66), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.4, 0.76), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.76), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.76), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.4, 0.86), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.51, 0.86), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.62, 0.86), screenToWorldSpace(0.09, 0.08), screenToWorldSpace(0.09, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),

                // BUILDING 4
                new UIButton(screenToWorldSpace(0.755, 0.48), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.875, 0.48), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.755, 0.58), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.875, 0.58), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.755, 0.68), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.875, 0.68), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.755, 0.78), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.875, 0.78), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.755, 0.88), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),
                new UIButton(screenToWorldSpace(0.875, 0.88), screenToWorldSpace(0.1, 0.08), screenToWorldSpace(0.1, 0.08), 
                    (a) => {clickWindow(a);setupScene();}, "", "#666666"),

                // BUILDING 5
                //new UIButton(screenToWorldSpace(0.915, 0.63), screenToWorldSpace(0.07, 0.1), screenToWorldSpace(0.07, 0.1), (a) => {clickWindow(a)}, "", "#666666"),
                //new UIButton(screenToWorldSpace(0.915, 0.75), screenToWorldSpace(0.07, 0.1), screenToWorldSpace(0.07, 0.1), (a) => {clickWindow(a)}, "", "#666666"),
                //new UIButton(screenToWorldSpace(0.915, 0.87), screenToWorldSpace(0.07, 0.1), screenToWorldSpace(0.07, 0.1), (a) => {clickWindow(a)}, "", "#666666")

            ],
            text: [
                new UIText(screenToWorldSpace(0.36,0.07), "26", "'Courier new'", "white", "Energy wasted"),
                new UIText(screenToWorldSpace(0.78,0.04), "30", "'Courier new'", "white", ""),
            ],

            pauseMenu: {
                buttons: [
                    new UIButton(
                        screenToWorldSpace(0.4, 0.4), screenToWorldSpace(0.2, 0.1), screenToWorldSpace(0.21, 0.11),
                        () => {
                            gameIsPaused = false;
                            updateLimiter = true;
                            setupScene();
                        },
                        "Resume"),
                    new UIButton(
                        screenToWorldSpace(0.4, 0.6), screenToWorldSpace(0.2, 0.1), screenToWorldSpace(0.21, 0.11),
                        () => {
                            gameIsPaused = false;
                            currentScene = "level_select";
                            init();
                        },
                        "exit")
                ],
                text: [
                    new UIText(
                        screenToWorldSpace(0.5, 0.22), "62", "'Courier new'", "white", "⊣ PAUSED ⊢",
                        undefined, undefined, "center"
                    )
                ],
                sprites: [
                    new UIRect(screenToWorldSpace(0.325, 0.175), screenToWorldSpace(0.35, 0.65), BLUE, 10)
                ]
            },

            loss_menu: {
                buttons: [
                    new UIButton(
                        screenToWorldSpace(0.4, 0.6), screenToWorldSpace(0.2, 0.1), screenToWorldSpace(0.21, 0.11),
                        () => {
                            finish()
                        },
                        "Exit")
                ],
                text: [
                    new UIText(
                        screenToWorldSpace(0.5, 0.22), "52", "'Courier new'", "white", "⊣ LEVEL LOST ⊢",
                        undefined, undefined, "center"
                    ),
                    new UIText(screenToWorldSpace(0.5, 0.4), "28", "'Courier new'", "white", "", undefined, undefined, "center")
                ],
                sprites: [
                    new UIRect(screenToWorldSpace(0.25, 0.175), screenToWorldSpace(0.5, 0.65), BLUE, 10)
                ]
            }
        },
        Background: [
            new UIRect([0, 0], [canvasDims.width, canvasDims.height], "#293e55ff", 0),
            new UIRect(screenToWorldSpace(0, 0.2), screenToWorldSpace(0.08, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.08, 0.17), screenToWorldSpace(0.09, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.17, 0.28), screenToWorldSpace(0.12, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.29, 0.17), screenToWorldSpace(0.08, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.37, 0.15), screenToWorldSpace(0.1, 1), "#333333"),
            //new UIRect(screenToWorldSpace(0.47, 0.26), screenToWorldSpace(0.12, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.59, 0.13), screenToWorldSpace(0.1, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.69, 0.29), screenToWorldSpace(0.07, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.76, 0.19), screenToWorldSpace(0.11, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.87, 0.27), screenToWorldSpace(0.07, 1), "#333333"),
            new UIRect(screenToWorldSpace(0.93, 0.5), screenToWorldSpace(1, 1), "#333333"),
        ]
    }
};

// applies initial settings
function init() {
    resizeCanvas();
    start();
    currentScene = startScene;
    setupScene();
}
var updateLimiter = false;
var gameIsPaused = false;
var levelLost = false;

function startFrames() {
    //reset update limit for on screen button presses.
    updateLimiter = false;
    setDelta();

    //update game logic
    if (currentScene === "game" && !gameIsPaused) {
        logicUpdate();
    }

    // erase canvas
    ctx.clearRect(0, 0, canvasDims.width, canvasDims.height);

    // render entities in order
    renderBackground();
    renderProps();
    renderFloatUI();

    // call next frame
    window.requestAnimationFrame(startFrames);
}

function setupScene() {
    //--------------------------------------------------------------------------
    // clear all rendering buffers (implemented as lists)
    BACKGROUND_ELEMS.splice(0, BACKGROUND_ELEMS.length);
    BUILDINGS.splice(0,BUILDINGS.length);
    UI.splice(0, UI.length);
    UI_FLOAT.splice(0, UI_FLOAT.length);
    //--------------------------------------------------------------------------
    // Add objects to each buffer

    // add buttons to UI buffer
    for (let i in SCENES[currentScene].UI.buttons) {
        var button = SCENES[currentScene].UI.buttons[i];
        button.currentDims.w = button.originalDims.w;
        button.currentDims.h = button.originalDims.h;
        button.offset.y = (button.originalDims.h - button.currentDims.h) / 2;
        button.offset.x = (button.originalDims.w - button.currentDims.w) / 2;
        UI.push(button);
    }
    // add text to UI buffer
    for (let i in SCENES[currentScene].UI.text) {
        UI.push(SCENES[currentScene].UI.text[i]);
    }
    // add background objects to background buffer
    for (let i in SCENES[currentScene].Background) {
        BACKGROUND_ELEMS.push(SCENES[currentScene].Background[i]);
    }
    // push sprites onto background buffer to add ontop of background objects
    for (let i in SCENES[currentScene].UI.sprites) {
        BACKGROUND_ELEMS.push(SCENES[currentScene].UI.sprites[i]);
    }

    //--------------------------------------------------------------------------
    // manage float UI if game is paused
    if (gameIsPaused) {
        for (let i in SCENES.game.UI.pauseMenu.sprites) {
            UI_FLOAT.push(SCENES.game.UI.pauseMenu.sprites[i]);
        }
        for (let i in SCENES.game.UI.pauseMenu.buttons) {
            var button = SCENES.game.UI.pauseMenu.buttons[i];
            button.currentDims.w = button.originalDims.w;
            button.currentDims.h = button.originalDims.h;
            button.offset.y = (button.originalDims.h - button.currentDims.h) / 2;
            button.offset.x = (button.originalDims.w - button.currentDims.w) / 2;
            UI_FLOAT.push(button);
        }
        for (let i in SCENES.game.UI.pauseMenu.text) {  
            UI_FLOAT.push(SCENES.game.UI.pauseMenu.text[i]);
        }
    }
    //--------------------------------------------------------------------------
    // manage float UI if game is lost
    if (levelLost) {
        for (let i in SCENES.game.UI.loss_menu.sprites) {
            UI_FLOAT.push(SCENES.game.UI.loss_menu.sprites[i]);
        }
        for (let i in SCENES.game.UI.loss_menu.buttons) {
            var button = SCENES.game.UI.loss_menu.buttons[i];
            button.currentDims.w = button.originalDims.w;
            button.currentDims.h = button.originalDims.h;
            button.offset.y = (button.originalDims.h - button.currentDims.h) / 2;
            button.offset.x = (button.originalDims.w - button.currentDims.w) / 2;
            UI_FLOAT.push(button);
        }

        for (let i in SCENES.game.UI.loss_menu.text) {
            UI_FLOAT.push(SCENES.game.UI.loss_menu.text[i]);
        }
    }

}

export function loseLevel() {
    levelLost = true;
    setupScene();
}

window.onload = () => {
    init(); // initialize the game
    startFrames(); // start running frames
}
//#endregion 

//========================================================
//======================== MUSIC =========================
// All music © 2023 Henry Grantham-Smith.
//#region music
var currentIndex = 0;

async function playTracks() {
    var tracks = await shuffleArray(["../static/songs/ECOPOLY-1.mp3"]);
    // Set the duration of the break between tracks (in milliseconds)
    var breakDuration = 2000;

    // Create an array of Promises to preload the audio files
    var preloadPromises = tracks.map(track => {
        return new Promise(resolve => {
            var audio = new Audio(track);
            audio.addEventListener('canplaythrough', () => {
                resolve();
            });
        });
    });

    // Wait for all the audio files to finish preloading
    await Promise.all(preloadPromises);

    // Create a loop to play each track
    while (true) {
        // Create a new audio element
        var audio = new Audio(tracks[currentIndex]);

        // Play the audio
        audio.play();

        // Wait for the audio to finish playing before scheduling the next track
        await new Promise(resolve => audio.addEventListener('ended', resolve));

        // Increment the current index to play the next track
        currentIndex++;

        // If the current index is equal to the length of the playlist,
        // reset the index to 0 to start playing the playlist from the beginning
        if (currentIndex == tracks.length) {
            currentIndex = 0;
        }

        // Wait for the break duration before playing the next track
        await new Promise(resolve => setTimeout(resolve, breakDuration));
    }
}
//#endregion