'use strict';

//Lumikasa source code (Luokkanen Janne, 2015-2021)
const version = "0x4BC";

function TimeNow(){
	//return Date.now();
	return performance.now();
}

let activeMenu = null, activeSubmenu = null, animMenu = null;
let loadingScreen = true, loadingDone = false, skipAdventure = false;
let playerConfirm = false, firstJoined = 0;

const cancel = 0;
let selectedOption = null, activeOption = null, lastOption = null;
let optionSelected = false, menuAnimating = false;
let animForce = 0.025, menuAnimThreshold = 0.25;

let menuBgColor = "#000000DD", menuBorderColor = "#00AAAA", menuTextColor = "#FFFF00", menuTextFadeColor = "#777700", menuTitleColor = "#FFFFFF";
let optionBgColor = "#000000DD", optionBorderColor = "#00AAAA", optionTextColor = "#00AAAA", optionFadeColor = "#005555";
let optionBgHighlightColor = "#000000DD", optionBorderHighlightColor = "#FFFFFF", optionTextHighlightColor = "#FFFFFF";
let	plainTextColor = "#FFFFFF", playerTextColor = "#000000";
let PlayerColors = [null,
{color:"#0000FF", fadeColor:"#000077", bgColor:"#CCCCFF", bgFadeColor:"#666677"}, //player1
{color:"#FF0000", fadeColor:"#770000", bgColor:"#FFCCCC", bgFadeColor:"#776666"}, //player2
{color:"#00FF00", fadeColor:"#007700", bgColor:"#CCFFCC", bgFadeColor:"#667766"}, //player3
{color:"#FFFF00", fadeColor:"#777700", bgColor:"#FFFFCC", bgFadeColor:"#777766"} //player4
];

let maxSpeed = 0.625;
let positionCorrection = 0.05;
let jumpForce = -0.625;
let maxDropSpeed = 1.25;
let ballSpeed = 2.5;
let knockBackForce = 0.02;
let momentumThreshold = 0.005;

let momentumChange = 0.00025;
let friction = 0.001;
let acceleration = 0.0025;
let dropAcceleration = 0.002;

let chargeInterval = 10; //ms
let jumpLimit = 300; //ms
let invulnerabilityLimit = 5000; //ms
let statusVisibilityLimit = 5000; //ms

let baseMaxSpeed=maxSpeed,
basePositionCorrection=positionCorrection,
baseJumpForce=jumpForce,
baseMaxDropSpeed=maxDropSpeed,
baseBallSpeed=ballSpeed,
baseKnockBackForce=knockBackForce,
baseMomentumThreshold=momentumThreshold,
baseMomentumChange=momentumChange,
baseFriction=friction,
baseAcceleration=acceleration,
baseDropAcceleration=dropAcceleration;

let LevelImages = [];
for(let i = 0; i <= 68; i++)
	LevelImages.push("assets/level"+i+".png");
let loadLevelCount = LevelImages.length;
let initLevelCount = loadLevelCount;

let StageImages = [
	"assets/stage0.png",
	"assets/stage1.png",
	"assets/stage2.png",
	"assets/stage3.png",
	"assets/stage4.png",
	"assets/stage5.png",
	"assets/stage6.png",
	"assets/stage7.png",
	"assets/terrain.gif"
];
let loadStageCount = StageImages.length;
let initStageCount = loadStageCount;

let Levels = [];
for(let i = 0; i < LevelImages.length; i++){
	Levels.push(new Image());
	Levels[i].onload = function(){if(!skipAdventure)loadLevelCount--;};
	Levels[i].src = LevelImages[i];
}
let Stages = [];
for(let i = 0; i < StageImages.length; i++){
	Stages.push(new Image());
	Stages[i].onload = function(){loadStageCount--;};
	Stages[i].src = StageImages[i];
}

let stageRow = 0, stageRowStep = 0, stageColumnCount = 3;
function GetLastStageRow(){
	return Math.max(0,Math.ceil(Stages.length/stageColumnCount)-stageColumnCount);
}

let stageCanvas = document.createElement('canvas');
let stageRender = stageCanvas.getContext('2d');

let terrain = {
	canvas:null,
	render:null,
	colData:[],
	collided:new Array(Levels.length),
	ResetCollided(){
		let collidedLength = gameMode===GameMode.adventure ? this.collided.length : 1;
		for(let c = 0; c < collidedLength; c++)
			this.collided[c] = false;
	}
};
let terrainPixelIndex = 0, terrainPixelBit = 0, terrainPixelMask = 0;

let mouseX = 0, mouseY = 0, mouseDraw = -1, mouseDrag = false;
let mouseAxisX = 0, mouseAxisY = 0;
let scrollAxisX = 0, scrollAxisY = 0;
let oldMouseX = 0, oldMouseY = 0;

let Crosshair = [null,new Image(),new Image(),new Image(),new Image()];
let loadCrossCount = Crosshair.length-1;
for(let i = 1; i < Crosshair.length; i++){
	Crosshair[i].src = "assets/crosshair"+i+".gif";
	Crosshair[i].onload = function(){
		loadCrossCount--;
		this.xOffset = this.naturalWidth/2;
		this.yOffset = this.naturalHeight/2;
	};
}
let aimArea = 1000;
let aimMargin = 0.6;

let snowRate = 0;
function SnowRate(multiplier,min){
	//return Clamp(snowRate*multiplier,min,1);
	return Clamp(snowRate*Math.pow(multiplier,speedMultiplier),min,1);
}

let Sounds = {
	confirm:new Audio("assets/confirm.ogg"),
	cancel:new Audio("assets/cancel.ogg"),
	select:new Audio("assets/select.ogg"),
	snow:new Audio("assets/snow.ogg"),
	charge:new Audio("assets/charge.ogg"),
	shot:new Audio("assets/shot.ogg"),
	death:new Audio("assets/death.ogg")
};
let loadSoundCount = Object.keys(Sounds).length;
for(let sound in Sounds){
	if(Sounds.hasOwnProperty(sound))
		Sounds[sound].oncanplaythrough = function(){loadSoundCount--;};
}
function PlaySound(sound){
	if(soundVolume>0){
		sound.volume = soundVolume;
		//sound.pause();
		sound.currentTime=0;
		if(sound.paused)
			sound.play();
	}
} function LoopSound(sound,volumeMultiplier){
	if(soundVolume>0){
		sound.volume = soundVolume*volumeMultiplier;
		if(sound.paused){
			sound.loop = true;
			sound.play();
		}
	}
} function StopLoop(sound){
	sound.volume = 0;
	sound.loop = false;
} function StopLoops(sounds){
	for(let sound in sounds){
		if(sounds.hasOwnProperty(sound)){
			if(sounds[sound].loop)
				StopLoop(sounds[sound]);
		}
	}
} function StopSound(sound){
	sound.volume = 0;
	sound.loop = false;
	//sound.pause(); //seems to cause issues
} function StopAllSounds(){
	for(let sound in Sounds){
		if(Sounds.hasOwnProperty(sound))
			StopSound(Sounds[sound]);
	}
	for(let p = 0; p < Players.length; p++){
		let player = Players[p];
		for(let sound in player.Sounds){
			if(player.Sounds.hasOwnProperty(sound))
				StopSound(player.Sounds[sound]);
		}
		for(let b = 0; b < player.Balls.length; b++){
			let ball = player.Balls[b];
			for(let sound in ball.Sounds){
				if(ball.Sounds.hasOwnProperty(sound))
					StopSound(ball.Sounds[sound]);
			}
		}
	}
}

let Players = [];
for(let i = 0; i <= 4; i++){
	Players.push({
		canvas:null,
		render:null,
		copyCanvas:null,
		copyRender:null,
		aimAxisX:0.0,
		aimAxisY:0.0,
		aimCentered:false,
		aimX:0,
		aimY:0,
		Balls:[],
		cancelKey:false,
		chargeCount:0,
		chargeHold:false,
		charging:false,
		chargeValue:0,
		colBottom:0,
		colMiddle:0,
		colPoints:[],
		colRadius:0,
		colTop:0,
		confirmKey:false,
		down:false,
		downValue:0,
		inputMethod:-1,
		inputInfo:{id:"", index:null},
		invulnerability:0,
		joined:false,
		jump:false,
		jumpTimer:0,
		left:false,
		leftValue:0,
		level:0,
		lives:0,
		momentumX:0.0, //current X-momentum
		momentumY:0.0, //current Y-momentum
		newJump:true, //prevents jump from happening repeatedly
		number:i,
		onGround:false,
		pauseKey:false,
		playerHeight:0, //change name: height?
		playerPosX:0,	//change name: posX?
		playerPosY:0,	//change name: posY?
		playerRadius:0,
		playerWidth:0, //change name: width?
		pixelCount:0,
		pixelCountMax:0, //amount of pixels that need to be collected before growth
		right:false,
		rightValue:0,
		rotMomentum:0.0,
		score:0,
		sizeLevel:0,
		Sounds:{
			charge:new Audio(Sounds.charge.src),
			death:new Audio(Sounds.death.src)
		},
		statusVisibility:0,
		up:false,
		upValue:0
		});

		Players[i].canvas = document.createElement('canvas');
		Players[i].canvas.height = 0;
		Players[i].canvas.width = 0;
		Players[i].render = Players[i].canvas.getContext('2d');

		Players[i].copyCanvas = document.createElement('canvas');
		Players[i].copyCanvas.height = 0;
		Players[i].copyCanvas.width = 0;
		Players[i].copyRender = Players[i].copyCanvas.getContext('2d');
}
let IngamePlayers = [];

//Rendering
let gameCanvas = document.getElementById('gameCanvas');
let gameRender = gameCanvas.getContext('2d');
let guiCanvas = document.createElement('canvas');
let guiRender = guiCanvas.getContext('2d');
let tempCanvas = document.createElement('canvas');
let tempRender = tempCanvas.getContext('2d');

let screenWidth = 0, screenHeight = 0, pixelRatio = 0, pixelScale = 100;
let scaledWidth = 0, scaledHeight = 0;
let scaledWidthHalf = 0, scaledHeightHalf = 0;

//Positions
let middlePointX = 0,middlePointY = 0;
let levelPosX = 0,levelPosY = 0;

//Useful variables
let areaScale=1;
let ballX=0,ballY=0;
let ballLevelX=0,ballLevelY=0;
const degToRad = Math.PI/180;

let Input = {
	up:0,
	down:1,
	left:2,
	right:3,
	jump:4,
	charge:5,
	chargehold:6,
	confirm:7,
	cancel:8,
	pause:9,
	aimXneg:10,
	aimXpos:11,
	aimYneg:12,
	aimYpos:13
};
let defaultKeyboard = [
	{name:["ArrowUp","W"], input:["ArrowUp","KeyW"], deadzone:0},
	{name:["ArrowDown","S"], input:["ArrowDown","KeyS"], deadzone:0},
	{name:["ArrowLeft","A"], input:["ArrowLeft","KeyA"], deadzone:0},
	{name:["ArrowRight","D"], input:["ArrowRight","KeyD"], deadzone:0},
	{name:["ArrowUp","W"], input:["ArrowUp","KeyW"], deadzone:0},
	{name:["Mouse0"], input:["m0"], deadzone:0},
	{name:["Mouse2"], input:["m2"], deadzone:0},
	{name:["Enter"], input:["Enter"], deadzone:0},
	{name:["Backspace"], input:["Backspace"], deadzone:0},
	{name:["Pause","P"], input:["Pause","KeyP"], deadzone:0},
	{name:["-MouseX"], input:["-mX"], deadzone:0},
	{name:["+MouseX"], input:["+mX"], deadzone:0},
	{name:["-MouseY"], input:["-mY"], deadzone:0},
	{name:["+MouseY"], input:["+mY"], deadzone:0}];
let defaultGamepad = [ //button/axis,id,deadzone
	{name:["-Axis(1)","Joy(12)"], input:["-a1",12], deadzone:0.25},
	{name:["+Axis(1)","Joy(13)"], input:["+a1",13], deadzone:0.25},
	{name:["-Axis(0)","Joy(14)"], input:["-a0",14], deadzone:0.25},
	{name:["+Axis(0)","Joy(15)"], input:["+a0",15], deadzone:0.25},
	{name:["-Axis(1)","Joy(12)"], input:["-a1",12], deadzone:0.5},
	{name:["Joy(7)"], input:[7], deadzone:0.01},
	{name:["Joy(6)"], input:[6], deadzone:0.01},
	{name:["Joy(0)"], input:[0], deadzone:0.5},
	{name:["Joy(1)"], input:[1], deadzone:0.5},
	{name:["Joy(9)"], input:[9], deadzone:0.5},
	{name:["-Axis(2)"], input:["-a2"], deadzone:0.2},
	{name:["+Axis(2)"], input:["+a2"], deadzone:0.2},
	{name:["-Axis(3)"], input:["-a3"], deadzone:0.2},
	{name:["+Axis(3)"], input:["+a3"], deadzone:0.2}];
let KeyBindings = []; //upKey,downKey,leftKey,rightKey,jumpKey,chargeKey,chargeHoldKey,confirmKey,cancelKey,pauseKey,-AimX,+AimX,-AimY,+AimY
function GetDefaultBindings(defaulBindings){
	let bindings = [];

	for(let key = 0; key < defaulBindings.length; key++)
		bindings.push({name:defaulBindings[key].name, input:defaulBindings[key].input, deadzone:defaulBindings[key].deadzone, value:new Array(defaulBindings[key].input.length).fill(0), blocked:new Array(defaulBindings[key].input.length).fill(false)});

	return bindings;
}
function SetKeyBinding(playerNum, inputType, name, input){
	let KeyBind = KeyBindings[playerNum][inputType];
	if(resetBinding){
		KeyBind.name = [];
		KeyBind.input = [];
		KeyBind.value = [];
	}
	if(!KeyBind.input.includes(input)){
		KeyBind.name.push(name);
		KeyBind.input.push(input);
		KeyBind.value.push(0);
	}
	
	if(Players[playerNum].inputMethod>0){ //not keyboard&mouse
		for(let key = 0; key < KeyBindings[playerNum].length; key++)
			KeyBindings[playerNum][key].blocked = new Array(KeyBindings[playerNum][key].input.length).fill(true); //prevents immediate input after keybind
	}
}
function ResetKeyValues(){ //for save loading
	for(let pl = 0; pl < Players.length; pl++){
		for(let key = 0; key < KeyBindings[pl].length; key++){
			KeyBindings[pl][key].value = new Array(KeyBindings[pl][key].input.length).fill(0);
			KeyBindings[pl][key].blocked = new Array(KeyBindings[pl][key].input.length).fill(false);
		}
	}
}

KeyBindings[0] = GetDefaultBindings(defaultKeyboard); //player0

KeyBindings[1] = GetDefaultBindings(defaultKeyboard); //player1
KeyBindings[2] = GetDefaultBindings(defaultGamepad); //player2
KeyBindings[3] = GetDefaultBindings(defaultGamepad); //player3
KeyBindings[4] = GetDefaultBindings(defaultGamepad); //player4

let deadzoneSliderWidth = 5, deadzoneTargetWidth = 5, deadzoneSliderSmall = 5, deadzoneSliderLarge = 15;
let keyBinding = false;
let resetBinding = false;
let keyBindingTimeout = 5; //seconds
let keyBindingText = "";
let activeBinding = -1;
let activePlayer = 1;
let gamepads;
let gamepadTemp = null;
let InputMethods = [
{id:"Keyboard&Mouse", index:-1, player:0}
];

let directionInputTime = TimeNow();
let directionInputRepeatInterval = 500; //ms

//System (+Debug) variables
let pause = true;
let gameStarted = false;
let noClear = false;
let noClip = false;
let noBounds = false;
let noCollect = false;
let noGrow = false;
let noPile = false;
let collectCharge = false;
let instantCharge = false;
let infiniteJump = false;
let wallJump = false;
let noKnockback = false;
let fixedCamera = false;
let imageSmooth = true;
let shotSpeed = 5;
let winScore = 5;
let lifeCount = 3;
let levelIndex = 0; //levelIndex AND stageIndex?
let soundVolume = 0.15;
let guiScaleOn = true;
let guiScale = 1;
let vsync = true;
let PerfInfo = {
	Reset(){
		this.frameCount=0;
		this.totalFrameCount=0;
		this.fps=0;
		this.fpsLog=[];
		this.frameTime=0;
		this.frameTimeMax=0;
		//this.frameTimeLog=[];
		this.frameInfo="";
		this.fpsInfo="";
		this.frameUpdate=TimeNow();
		this.fpsUpdate=TimeNow();
	},
	LogFrame(currentTime){
		this.frameCount++;
		this.totalFrameCount++;
		this.frameTime = currentTime-this.frameUpdate;
		this.frameTimeMax = Math.max(this.frameTime,this.frameTimeMax);
		//this.frameTimeLog.push(this.frameTime);
		this.frameInfo = "Frame:"+this.totalFrameCount+" | "+this.frameTime.toFixed(3)+"ms (max:"+this.frameTimeMax.toFixed(3)+") | Steps:"+steps.toFixed(3);
		this.frameUpdate = currentTime;
	},
	LogFps(currentTime){
		this.fps = this.frameCount * 1000/(currentTime-this.fpsUpdate);
		this.frameCount = 0;
		this.fpsLog.push(this.fps);
		let fpsAvg = this.fpsLog.reduce((sum, val) => sum + val)/this.fpsLog.length;
		this.fpsInfo = "Avg:"+fpsAvg.toFixed(2)+" | "+this.fps.toFixed(2);
		this.fpsUpdate = currentTime;
	},
	Update(currentTime){
		this.LogFrame(currentTime);
		if((currentTime-this.fpsUpdate)>=500)
			this.LogFps(currentTime);
	}
};
let updateInterval = 2;
let speedMultiplier = 0;
let lastTime = TimeNow();
let steps = 0;
let frameHold = false;
let frameStep = false;
let debugMode = false;
let DebugKeys = {
	ScrollLock(){
		debugMode=!debugMode;
		PerfInfo.Reset();
	},
	Comma(){
		frameHold=!frameHold;
		lastTime = TimeNow();
	},
	Period(){
		frameStep=true;
		frameHold=true;
		lastTime = TimeNow();
	},
	KeyX(){
		guiScaleOn=!guiScaleOn;
		ScreenSize();
	},
	KeyN(){
		if(pixelScale>1)pixelScale--;
		ScreenSize();
	},
	KeyM(){
		pixelScale++;
		ScreenSize();
	},
	KeyZ(){
		imageSmooth=!imageSmooth;
		ScreenSize();
	},
	KeyC(){noClear=!noClear;},
	KeyV(){vsync=!vsync;},
	KeyJ(){LoadLevel(--levelIndex);},
	KeyL(){LoadLevel(++levelIndex);},
	Home(){updateInterval++;},
	End(){if(updateInterval>1) updateInterval--;},
	PageUp(){UpdateMultiplier(++speedMultiplier);},
	PageDown(){UpdateMultiplier(--speedMultiplier);},
	Digit1(){noClip=!noClip;},
	Digit2(){noBounds=!noBounds;},
	Digit3(){noCollect=!noCollect;},
	Digit4(){noGrow=!noGrow;},
	Digit5(){noPile=!noPile;},
	Digit6(){noKnockback=!noKnockback;},
	Digit7(){collectCharge=!collectCharge;},
	Digit8(){instantCharge=!instantCharge;},
	Digit9(){wallJump=!wallJump;},
	Digit0(){infiniteJump=!infiniteJump;},
	Backquote(){fixedCamera=!fixedCamera;},
	Minus(){if(shotSpeed>0) shotSpeed--;},
	Equal(){shotSpeed++;},
	BracketLeft(){aimMargin = Clamp(aimMargin*0.98, 0.0001, 1);},
	BracketRight(){aimMargin = Clamp(aimMargin*1.02, 0.0001, 1);},
	Semicolon(){aimArea = Clamp(aimArea*0.98, 1, Infinity);},
	Quote(){aimArea = Clamp(aimArea*1.02, 1, Infinity);}
};
let GameMode = {
	adventure:0,
	battle:1
};
let gameMode = GameMode.adventure;
let GameType = {
	score:0,
	life:1
};
let gameType = GameType.score;

UpdateMultiplier(updateInterval);

function ScreenSize(){ //Initialize game screen and update middlePoint (if screensize changes...)
	pixelRatio = Math.max(window.devicePixelRatio*(pixelScale/100),1/gameCanvas.offsetWidth,1/gameCanvas.offsetHeight);
	screenWidth = gameCanvas.offsetWidth*pixelRatio;
	screenHeight = gameCanvas.offsetHeight*pixelRatio;
	
	gameCanvas.width = guiCanvas.width = screenWidth;
	gameCanvas.height = guiCanvas.height = screenHeight;

	if(guiScaleOn){
		guiScale = Math.min(screenWidth/1280,screenHeight/720);

		/*if(guiScale>=1)
			guiScale = Math.floor(guiScale);*/ //integer scale for menus if resolution is high enough

		guiRender.scale(guiScale,guiScale);
	} else
		guiScale = 1;
	
	gameRender.imageSmoothingEnabled = guiRender.imageSmoothingEnabled = imageSmooth;

	scaledWidth = screenWidth/guiScale;
	scaledHeight = screenHeight/guiScale;

	scaledWidthHalf = Math.floor(scaledWidth/2);
	scaledHeightHalf = Math.floor(scaledHeight/2);

	middlePointX = screenWidth/2;
	middlePointY = screenHeight/2;
}
function UpdateMultiplier(value){ //pre-calculate movement values
	speedMultiplier = (value>1) ? value : 1;
	
	maxSpeed = baseMaxSpeed*speedMultiplier;
	positionCorrection = basePositionCorrection*speedMultiplier;
	jumpForce = baseJumpForce*speedMultiplier;
	maxDropSpeed = baseMaxDropSpeed*speedMultiplier;
	ballSpeed = baseBallSpeed*speedMultiplier;
	knockBackForce = baseKnockBackForce*speedMultiplier;
	momentumThreshold = baseMomentumThreshold*speedMultiplier;
	
	momentumChange = baseMomentumChange*Math.pow(speedMultiplier,2);
	friction = baseFriction*Math.pow(speedMultiplier,2);
	acceleration = baseAcceleration*Math.pow(speedMultiplier,2);
	dropAcceleration = baseDropAcceleration*Math.pow(speedMultiplier,2);
}
function DirectionalKey(player, inputType, state, value){
	let oldState = false;
	if(inputType === Input.up){
		oldState = player.up;
		player.up = state;
		player.upValue = value;
	} else if(inputType === Input.down){
		oldState = player.down;
		player.down = state;
		player.downValue = value;
	} else if(inputType === Input.left){
		oldState = player.left;
		player.left = state;
		player.leftValue = value;
	} else if(inputType === Input.right){
		oldState = player.right;
		player.right = state;
		player.rightValue = value;
	}
	
	if(loadingScreen || playerConfirm || activeMenu===null || !state)
		return;
	
	if(!oldState)
		directionInputTime = TimeNow();
	else if(TimeNow()-directionInputTime < directionInputRepeatInterval)
		return;
	
	NavigateGUI(inputType);
} function JumpKey(player, state){
	if(state){
		if(player.newJump){
			player.jump = true;
			player.newJump = false;
		}
	} else {
		if(player.jumpTimer>0)
			player.jumpTimer=jumpLimit;
		player.jump = false;
		player.newJump = true;
	}
} function ChargeKey(player, state, value){
	player.charging = state;
	player.chargeValue = value;
	if(!state)
		player.chargeCount = 0;
} function ChargeHoldKey(player, state){
	player.chargeHold = state;
} function ConfirmKey(player, state){
	if(!player.confirmKey && state){
		if(playerConfirm){
			if(player.number>0 && !player.joined){
				player.joined = true;
				if(firstJoined===0)
					firstJoined = player.number;
				PlaySound(Sounds.confirm);
			}
		} else if(!loadingScreen && activeMenu!==null){
			optionSelected = true;
			PlaySound((selectedOption===cancel || selectedOption.cancel) ? Sounds.cancel : Sounds.confirm); //"selectedOption===cancel" is probably pointless here
		}
	}
	player.confirmKey = state;
} function CancelKey(player, state){
	if(!player.cancelKey && state)
	if((!loadingScreen && activeSubmenu!==null) || activeMenu===GUI.pause){
		optionSelected = true;
		selectedOption = cancel;
		PlaySound(Sounds.cancel);
	}
	player.cancelKey = state;
} function PauseKey(player, state){
	if(!player.pauseKey && state){
		if(gameStarted && !pause)
			Pause();
		else if(activeMenu===GUI.pause){
			optionSelected = true;
			selectedOption = cancel;
			if(activeSubmenu!==null)
				PlaySound(Sounds.cancel);
		} else if(playerConfirm){
			if(player.number===firstJoined && player.joined)
				ConfirmPlayers();
		}
	}
	player.pauseKey = state;
} function Aim(player,x=null,y=null){ //both x and y = null -> Update AimX/Y
	if(x!==null || y!==null){
		if(x!==null) player.aimAxisX = x;
		if(y!==null) player.aimAxisY = y;
		return;
	}
	//Update AimX/Y
	let mouseXaim = false, mouseYaim = false;
	if(player.number===InputMethods[0].player){ //keyboard&mouse
		let Bind = KeyBindings[player.number];
		//checking if mouseAxis is assigned to aimAxes
		for(let type = Input.aimXneg; type <= Input.aimXpos; type++)
		for(let axis = 0; axis < Bind[type].input.length; axis++)
			mouseXaim = (Bind[type].input[axis][1] === 'm' || mouseXaim);
		
		for(let type = Input.aimYneg; type <= Input.aimYpos; type++)
		for(let axis = 0; axis < Bind[type].input.length; axis++)
			mouseYaim = (Bind[type].input[axis][1] === 'm' || mouseYaim);
	}
	if(mouseXaim)
		player.aimX=(player.aimAxisX*screenWidth+screenWidth)/2/areaScale;
	else {
		player.aimX=player.playerPosX+player.playerRadius;
		
		if(player.aimAxisX<0)
			player.aimX+=(player.playerPosX+player.playerRadius)*player.aimAxisX;
		else if(player.aimAxisX>0)
			player.aimX+=(screenWidth/areaScale-player.playerPosX-player.playerRadius)*player.aimAxisX;
	}
	if(mouseYaim)
		player.aimY=(player.aimAxisY*screenHeight+screenHeight)/2/areaScale;
	else {
		player.aimY=player.playerPosY+player.playerRadius;
		
		if(player.aimAxisY<0)
			player.aimY+=(player.playerPosY+player.playerRadius)*player.aimAxisY;
		else if(player.aimAxisY>0)
			player.aimY+=(screenHeight/areaScale-player.playerPosY-player.playerRadius)*player.aimAxisY;
	}
	if(player.aimAxisX === 0 && player.aimAxisY === 0)
		player.aimCentered = true;
	else
		player.aimCentered = false;
}
function SetInput(inputType,inputState,player,value){
	if(inputType === Input.up || inputType === Input.down || inputType === Input.left || inputType === Input.right)
		DirectionalKey(player, inputType, inputState, value);
	else if(inputType === Input.jump)
		JumpKey(player,inputState);
	else if(inputType === Input.charge)
		ChargeKey(player,inputState,value);
	else if(inputType === Input.chargehold)
		ChargeHoldKey(player,inputState);
	else if(inputType === Input.confirm)
		ConfirmKey(player,inputState);
	else if(inputType === Input.cancel)
		CancelKey(player,inputState);	
	else if(inputType === Input.pause)
		PauseKey(player,inputState);		
	else if(inputType === Input.aimXneg){
		if(inputState)
			Aim(player,-value,null);
		else if(player.aimAxisX<0)
			Aim(player,0,null);
	} else if(inputType === Input.aimXpos){
		if(inputState)
			Aim(player,value,null);
		else if(player.aimAxisX>0)
			Aim(player,0,null);
	} else if(inputType === Input.aimYneg){
		if(inputState)
			Aim(player,null,-value);
		else if(player.aimAxisY<0)
			Aim(player,null,0);
	} else if(inputType === Input.aimYpos){
		if(inputState)
			Aim(player,null,value);
		else if(player.aimAxisY>0)
			Aim(player,null,0);
	}
}
function InputUpdate(input,playerNum,value){
	let validInput = false;
	let KeyBind = KeyBindings[playerNum];
	for(let k = 0; k < KeyBind.length; k++){
		for(let i = 0; i < KeyBind[k].input.length; i++){
			if(input === KeyBind[k].input[i]){
				validInput = true;
				
				let prevValue = KeyBind[k].value[i];
				KeyBind[k].value[i] = Math.abs(value);
				
				if(!keyBinding && KeyBind[k].value[i] > KeyBind[k].deadzone){ //InputDown
					if(mouseDrag || optionSelected || menuAnimating || KeyBind[k].blocked[i])
						continue;
					
					SetInput(k,true,Players[playerNum],(KeyBind[k].value[i]-KeyBind[k].deadzone)/(1-KeyBind[k].deadzone)); //last parameter used to be just KeyBind[k].value[i]
					
				} else if(KeyBind[k].value[i] <= KeyBind[k].deadzone){ //InputUp (KeyBind[k].value[i] < KeyBind[k].deadzone || KeyBind[k].value[i]===0???)
					KeyBind[k].blocked[i] = false;
					if(prevValue > KeyBind[k].deadzone)
						SetInput(k,false,Players[playerNum],KeyBind[k].value[i]);
				}
			}
		}
	}
	return validInput;
}
function UpdateMousePos(x,y){
	mouseX = x/guiScale*pixelRatio;
	mouseY = y/guiScale*pixelRatio;
	mouseAxisX = mouseX/(scaledWidthHalf)-1;
	mouseAxisY = mouseY/(scaledHeightHalf)-1;
}
document.addEventListener('keydown', function(event){
	if(event.code==="")
		return;
	if(keyBinding){
		if(Players[activePlayer].inputMethod===0){
			SetKeyBinding(activePlayer, activeBinding, event.code.replace('Key',''), event.code);
			StopKeyBinding();
		} event.preventDefault();
	}
	else if(loadingScreen && loadingDone && event.code === "Enter")
		loadingScreen = false;
	else if(InputUpdate(event.code,InputMethods[0].player,1))
		event.preventDefault();
	else {
		if(event.code === "Escape" && document.fullscreenElement)
			document.exitFullscreen();
		else if(event.code === "KeyF" || event.code === "F4"){ //Enable fullscreen
			if(document.fullscreenElement)
				document.exitFullscreen();
			else
				gameCanvas.requestFullscreen();
			
			event.preventDefault();
		} else if(DebugKeys.hasOwnProperty(event.code)){
			if(debugMode || event.code === Object.keys(DebugKeys)[0])//other DebugKeys are checked only in debugMode
				DebugKeys[event.code]();
		}
	}
});
document.addEventListener('keyup', function(event){
	InputUpdate(event.code,InputMethods[0].player,0);
});
gameCanvas.addEventListener('mousedown', function(event){
	UpdateMousePos(event.clientX-this.offsetLeft,event.clientY-this.offsetTop);
	if(keyBinding){
		if(Players[activePlayer].inputMethod===0){
			SetKeyBinding(activePlayer, activeBinding, "Mouse"+event.button, "m"+event.button);
			StopKeyBinding();
		}
	} else if(!loadingScreen && activeMenu!==null){
		if(CheckMouse(true)){
			optionSelected = true;
			PlaySound((selectedOption===cancel || selectedOption.cancel) ? Sounds.cancel : Sounds.confirm);
		} else if(activeSubmenu===null)
			mouseDraw=event.button;
		else
			InputUpdate("m"+event.button,InputMethods[0].player,1);
	} else
		InputUpdate("m"+event.button,InputMethods[0].player,1);
	
	event.preventDefault();
});
document.addEventListener('mouseup', function(event){
	InputUpdate("m"+event.button,InputMethods[0].player,0);
	mouseDraw=-1;
	mouseDrag=false;
});
gameCanvas.addEventListener('mousemove', function(event){
	UpdateMousePos(event.clientX-this.offsetLeft,event.clientY-this.offsetTop);
	if(keyBinding){
		if(Players[activePlayer].inputMethod===0){
			if((mouseX-oldMouseX < -50 && mouseX < scaledWidth*0.1) || (mouseX-oldMouseX > 50 && mouseX > scaledWidth*0.9)){
				let axisSign = Math.sign(mouseX-oldMouseX)===1 ? "+" : "-";
				let axisName = axisSign + "MouseX";
				let axisCode = axisSign + "mX";
				
				SetKeyBinding(activePlayer, activeBinding, axisName, axisCode);
				
				StopKeyBinding();
			} else if((mouseY-oldMouseY < -50 && mouseY < scaledHeight*0.1) || (mouseY-oldMouseY > 50 && mouseY > scaledHeight*0.9)){
				let axisSign = Math.sign(mouseY-oldMouseY)===1 ? "+" : "-";
				let axisName = axisSign + "MouseY";
				let axisCode = axisSign + "mY";
				
				SetKeyBinding(activePlayer, activeBinding, axisName, axisCode);
				
				StopKeyBinding();
			}
		}
	} else if(!loadingScreen && activeMenu!==null){
		//let previousOption = selectedOption;
		CheckMouse(false);
		//if(previousOption !== selectedOption)
			//PlaySound(Sounds.select);
	}
	InputUpdate("-mX",InputMethods[0].player,Math.min(mouseAxisX,0));
	InputUpdate("+mX",InputMethods[0].player,Math.max(mouseAxisX,0));

	InputUpdate("-mY",InputMethods[0].player,Math.min(mouseAxisY,0));
	InputUpdate("+mY",InputMethods[0].player,Math.max(mouseAxisY,0));
});
let scrollBuffer = 0;
gameCanvas.addEventListener('wheel', function(event){
	if(keyBinding){
		if(Players[activePlayer].inputMethod===0){
			if(Math.abs(event.deltaX) > 1){
				let axisSign = Math.sign(event.deltaX)===1 ? "+" : "-";
				let axisName = axisSign + "ScrollX";
				let axisCode = axisSign + "sX";
				
				SetKeyBinding(activePlayer, activeBinding, axisName, axisCode);
				
				StopKeyBinding();
				scrollAxisX=0;
			} else if(Math.abs(event.deltaY) > 1){
				let axisSign = Math.sign(event.deltaY)===1 ? "+" : "-";
				let axisName = axisSign + "ScrollY";
				let axisCode = axisSign + "sY";
				
				SetKeyBinding(activePlayer, activeBinding, axisName, axisCode);
				
				StopKeyBinding();
				scrollAxisY=0;
			}
		}
		event.preventDefault();
	}
	if(activeSubmenu===GUI.battle && !playerConfirm && Stages.length>0)
	if(MouseOver(GUI.battle.background[0])){
		if(Math.sign(scrollBuffer)!==Math.sign(event.deltaY)) //if scrolling to opposite direction
			scrollBuffer = event.deltaY;
		else
			scrollBuffer += event.deltaY;
		if(Math.abs(scrollBuffer)>=1){
			stageRow += Math.sign(scrollBuffer);
			
			let clampedStageRow = Clamp(stageRow, 0, GetLastStageRow());
			if(stageRow !== clampedStageRow)
				stageRow = clampedStageRow;
			else if(selectedOption.parent === GUI.battle.background[0]){
				let clampedStageButton = Clamp(selectedOption.stage+Math.sign(scrollBuffer)*stageColumnCount, 0, Stages.length-1);
				selectedOption = GUI.battle.stagebutton[clampedStageButton];
			}
			scrollBuffer = 0;
		}
		event.preventDefault();
		return;
	}
	/*if(Math.sign(scrollAxisX)!==Math.sign(event.deltaX) && event.deltaX!==0) //reset X to center if opposite movement
		scrollAxisX = 0;
	if(Math.sign(scrollAxisY)!==Math.sign(event.deltaY) && event.deltaY!==0) //reset Y to center if opposite movement
		scrollAxisY = 0;*/
	scrollAxisX = Clamp(scrollAxisX+event.deltaX/100, -1, 1);
	scrollAxisY = Clamp(scrollAxisY+event.deltaY/100, -1, 1);
	
	if(InputUpdate("-sX",InputMethods[0].player,Math.min(scrollAxisX,0)))
		event.preventDefault();
	if(InputUpdate("+sX",InputMethods[0].player,Math.max(scrollAxisX,0)))
		event.preventDefault();
	
	if(InputUpdate("-sY",InputMethods[0].player,Math.min(scrollAxisY,0)))
		event.preventDefault();
	if(InputUpdate("+sY",InputMethods[0].player,Math.max(scrollAxisY,0)))
		event.preventDefault();
});
gameCanvas.addEventListener('drop', function(event){
	event.preventDefault();
	for(let i = 0; i < event.dataTransfer.files.length; i++){
		if(activeSubmenu!==GUI.battle || playerConfirm || menuAnimating){
			gameCanvas.style.backgroundImage = "url('"+URL.createObjectURL(event.dataTransfer.files[i])+"')";
			break;
		}
		let customStageImage = new Image();
		customStageImage.src = URL.createObjectURL(event.dataTransfer.files[i]);
		
		loadStageCount++;
		
		customStageImage.onerror = function(){
			//alert("Could not load image.");
			loadStageCount--;
		};
		customStageImage.onload = function(){
			Stages.push(this);
			
			AddStageButton(Stages.length-1,this.naturalWidth,this.naturalHeight);
			
			if(activeSubmenu===GUI.battle && !playerConfirm && !menuAnimating){
				stageRow = GetLastStageRow();
				selectedOption = GUI.battle.stagebutton[Stages.length-1];
			}
			
			loadStageCount--;
		};
	}
});
gameCanvas.addEventListener('dragover', function(event){
	event.preventDefault();
});
gameCanvas.addEventListener('contextmenu', function(event){
	if(InputMethods[0].player>0) //if some player uses keyboard&mouse
		event.preventDefault();
});
gameCanvas.addEventListener('click', function(event){
	if(loadingScreen){
		if(loadingDone)
			loadingScreen = false;
		else
			skipAdventure = true;
	}
	gameCanvas.focus();
});
gameCanvas.addEventListener('dblclick', function(event){
	if(playerConfirm)
		ConfirmPlayers();
	event.preventDefault(); //is this needed?
});
window.addEventListener('resize', function(event){
	ScreenSize();
});
/*window.addEventListener('gamepadconnected', function(event){
	UpdateInputMethods(true);
});
window.addEventListener('gamepaddisconnected', function(event){
	UpdateInputMethods(true);
});*/
function UpdateInputMethods(idCompare){
	gamepads = navigator.getGamepads();
	
	for(let pl = 1; pl < Players.length; pl++)
		Players[pl].inputMethod = -1;
	
	InputMethods.splice(1);
	InputMethods[0].player = 0;
	for(let gp = 0; gp < gamepads.length; gp++){
		if(gamepads[gp] !== null && gamepads[gp].connected)
			InputMethods.push({id:gamepads[gp].id, index:gamepads[gp].index, player:0});
	}

	for(let im = 0; im < InputMethods.length; im++){
		let inputMethodHasNoPlayer = true;
		for(let pl = 1; pl < Players.length; pl++){
			if(Players[pl].inputMethod === -1) //if player has no inputMethod assigned yet
			if((idCompare && Players[pl].inputInfo.id === InputMethods[im].id) || (!idCompare && Players[pl].inputInfo.index === InputMethods[im].index)){
				InputMethods[im].player = pl;
				Players[pl].inputMethod = im;
				Players[pl].inputInfo = {id:InputMethods[im].id, index:InputMethods[im].index};
				
				inputMethodHasNoPlayer = false;
				break;
			}
		}
		if(inputMethodHasNoPlayer)
		for(let pl = 1; pl < Players.length; pl++){
			if(Players[pl].inputInfo.id === ""){ //if player still has no inputMethod assigned
				InputMethods[im].player = pl;
				Players[pl].inputMethod = im;
				Players[pl].inputInfo = {id:InputMethods[im].id, index:InputMethods[im].index};
				
				KeyBindings[pl] = GetDefaultBindings((im===0) ? defaultKeyboard : defaultGamepad);
				break;
			}
		}
	}
	UpdateInputMethodMenu();
}
function CheckGamepads(){
	gamepads = navigator.getGamepads();
	let emptyGamepads = 0;
	for(let gp = 0; gp < gamepads.length; gp++){
		if(gamepads[gp] === null || !gamepads[gp].connected) //checking for empty gamepads
			emptyGamepads++;
	}
	if(gamepads.length-emptyGamepads !== InputMethods.length-1){
		if(keyBinding)
			StopKeyBinding();
		UpdateInputMethods(true);
	}
	
	if(InputMethods.length<=1) //if keyboard&mouse is the only inputMethod
		return;
	
	if(keyBinding){
		if(Players[activePlayer].inputMethod < 1)
			return;
		
		let gp = InputMethods[Players[activePlayer].inputMethod].index; //or Players[activePlayer].inputInfo.index
		
		if(gamepadTemp.axisValues.length===0 && gamepadTemp.buttonValues.length===0){
			for(let b = 0; b < gamepads[gp].buttons.length; b++)
				gamepadTemp.buttonValues.push(gamepads[gp].buttons[b].value);
			for(let a = 0; a < gamepads[gp].axes.length; a++)
				gamepadTemp.axisValues.push(Math.abs(gamepads[gp].axes[a]));
		}
		let currentDeadzone = KeyBindings[activePlayer][activeBinding].deadzone;
		for(let b = 0; b < gamepads[gp].buttons.length; b++){
			if(gamepads[gp].buttons[b].value>=gamepadTemp.buttonValues[b] && gamepadTemp.buttonValues[b]>currentDeadzone) //prevents immediate keybind
				continue;
			
			gamepadTemp.buttonValues[b] = 0; //disables the first if statement
			if(gamepads[gp].buttons[b].value > 0.9){
				SetKeyBinding(activePlayer, activeBinding, "Joy("+b+")", b);
				StopKeyBinding();
				return;
			}
		}
		for(let a = 0; a < gamepads[gp].axes.length; a++){
			if(Math.abs(gamepads[gp].axes[a])>=gamepadTemp.axisValues[a] && gamepadTemp.axisValues[a]>currentDeadzone) //prevents immediate keybind
				continue;
			
			gamepadTemp.axisValues[a] = 0; //disables the first if statement
			if(Math.abs(gamepads[gp].axes[a]) > 0.9){
				let axisSign = Math.sign(gamepads[gp].axes[a])===1 ? "+" : "-";
				let axisName = axisSign + "Axis("+a+")";
				let axisCode = axisSign + "a"+a;
				
				SetKeyBinding(activePlayer, activeBinding, axisName, axisCode);
				StopKeyBinding();
				return;
			}
		}
	}
	for(let pl = 1; pl < Players.length; pl++){ //used to be: im = 1; im < InputMethods.length; im++ directly
		if(Players[pl].inputMethod < 1)
			continue;
		
		let gp = InputMethods[Players[pl].inputMethod].index; //or Players[pl].inputInfo.index
		
		if(gamepads[gp] === null) //failsafe if gamepad disconnects during a session (Add !gamepads[gp].connected if gamepads[gp] is not null?)
			continue;
		
		for(let b = 0; b < gamepads[gp].buttons.length; b++)
			InputUpdate(b,pl,gamepads[gp].buttons[b].value);
		
		for(let a = 0; a < gamepads[gp].axes.length; a++){
			let axisCode = Math.sign(gamepads[gp].axes[a])===1 ? "+a"+a : "-a"+a;
			let inverseAxisCode = Math.sign(gamepads[gp].axes[a])===1 ? "-a"+a : "+a"+a;
			
			InputUpdate(axisCode,pl,gamepads[gp].axes[a]);
			InputUpdate(inverseAxisCode,pl,0);
		}
	}
}
function CreateColData(imageData){
	let colData = new Uint8Array(Math.ceil(imageData.length/32)); //Optimized boolean array (bitfield)
	
	let counter = 0;
	let colValue = 0;
	let cellIndex = 0;
	for(let dataIndex = 3; dataIndex < imageData.length; dataIndex += 4){
		if(imageData[dataIndex]!==0) //colPoint if pixel alpha is not zero
			colValue+=Math.pow(2,counter);
		counter++;
		if(counter===8 || dataIndex===imageData.length-1){ //last dataIndex accounts for resolutions not divisible by 8
			colData[cellIndex]=colValue;
			cellIndex++;
			colValue=0;
			counter=0;
		}
		
	}
	return colData;
}
function GetPixelMask(terrainPixel){
	terrainPixelIndex = terrainPixel >> 3;
	terrainPixelBit = terrainPixel-(terrainPixelIndex << 3);
	return (1 << terrainPixelBit);
}
function GetLevelColData(terrainPixel){
	terrainPixelMask = GetPixelMask(terrainPixel);
	return (terrain.colData[terrainPixelIndex] & terrainPixelMask);
}
function SetLevelColData(terrainPixel, active){
	terrainPixelMask = GetPixelMask(terrainPixel);
	
	if(active)
		terrain.colData[terrainPixelIndex] |= terrainPixelMask;
	else
		terrain.colData[terrainPixelIndex] &= ~terrainPixelMask;
}
function SetTerrainProperties(level){
	terrain.canvas = Levels[level].canvas;
	terrain.render = Levels[level].render;
	terrain.colData = Levels[level].colData;
}
function UpdateLevelData(level,levelX,levelY){ //object.level could be updated in this function already?
	let newLevelX = levelX;
	let newLevelY = levelY;
	let newLevel = 0;
	if(gameMode===GameMode.adventure){
		newLevel = FindLevel(level,newLevelX,newLevelY);
		SetTerrainProperties(newLevel);
		
		newLevelX -= Levels[newLevel].xOffset;
		newLevelY -= Levels[newLevel].yOffset;
	}
	return {level:newLevel, levelX:newLevelX, levelY:newLevelY};
}
function FindLevel(currentLevel,levelXpos,levelYpos){
	if(levelXpos<0)
		return 0;
	if(levelXpos > Levels[Levels.length-1].canvas.width+Levels[Levels.length-1].xOffset)
		return Levels.length-1;
	
	let newLevelLeft = levelXpos < Levels[currentLevel].xOffset;
	let newLevelRight = levelXpos >= Levels[currentLevel].canvas.width+Levels[currentLevel].xOffset;
	if(!newLevelLeft && !newLevelRight)
		return currentLevel;
	
	let newLevel = 0;
	let checkTarget = (newLevelLeft) ? 0 : Levels.length-1;
	let checkDirection = (newLevelLeft) ? -1 : 1;
	
	for(newLevel = currentLevel; newLevel !== checkTarget; newLevel+=checkDirection){
		if(levelXpos >= Levels[newLevel].xOffset && levelXpos < Levels[newLevel].canvas.width+Levels[newLevel].xOffset) //X-position is in bounds of the new level
			break;
	}
	
	if(levelYpos-Levels[newLevel].yOffset < 0 || levelYpos-Levels[newLevel].yOffset >= Levels[newLevel].canvas.height) //Y-position is not in bounds of the new level
		return currentLevel;
	
	return newLevel;
}
function LoadLevel(index){
	if(activeMenu!==null || loadingScreen)
		return;
	
	levelIndex = index;
	if(gameMode===GameMode.adventure){
		if(levelIndex<0)
			levelIndex=Levels.length-1;
		else if(levelIndex>=Levels.length || levelIndex===null) //failsafe
			levelIndex=0;
		
		SetTerrainProperties(levelIndex);
		
		for(let p = 0; p < IngamePlayers.length; p++)
			IngamePlayers[p].level = levelIndex;
		
		levelPosX = -Levels[levelIndex].xOffset;
		levelPosY = -Levels[levelIndex].yOffset;
	} else {
		if(levelIndex<0)
			levelIndex=Stages.length-1;
		else if(levelIndex>=Stages.length || levelIndex===null) //failsafe
			levelIndex=0;
		
		stageCanvas.width = Stages[levelIndex].naturalWidth;
		stageCanvas.height = Stages[levelIndex].naturalHeight;
		stageRender = stageCanvas.getContext('2d');
		
		terrain.canvas = stageCanvas;
		terrain.render = stageRender;
		
		terrain.render.drawImage(Stages[levelIndex], 0, 0 );
		
		terrain.colData = CreateColData(terrain.render.getImageData(0, 0, terrain.canvas.width, terrain.canvas.height).data);
	}
	InitializePlayers();
}
function InitializeGame(level){
	if(gameMode===GameMode.adventure && !debugMode){
		shotSpeed = 5;
		infiniteJump = false;
		noKnockback = false;
		instantCharge = false;
		fixedCamera = false;
		noPile = false;
	}

	IngamePlayers = [];
	for(let ap = 0; ap < Players.length; ap++){
		if(Players[ap].joined)
			IngamePlayers.push(Players[ap]);
	}
	
	LoadLevel(level);

	pause = false;
	gameStarted = true;
	lastTime = TimeNow(); //adds a little delay when the game starts
}
function InitializePlayers(){
	for(let p = 0; p < IngamePlayers.length; p++)
		InitializePlayer(IngamePlayers[p],true);
}
function InitializePlayer(player,newGame){
	if(newGame){
		player.lives = lifeCount;
		player.score = 0;
		player.statusVisibility = 0;
		for(let b = 0; b < player.Balls.length; b++)
			StopLoops(player.Balls[b].Sounds);
		player.Balls = [];
	}
	player.pixelCountMax = 100;
	player.sizeLevel = 0;
	player.momentumX = 0.0;
	player.momentumY = 0.0;
	player.rotMomentum = 0;
	player.jumpTimer = 0;
	player.onGround = false;

	player.playerWidth = 32;
	player.playerHeight = 32;

	player.canvas.height = player.playerHeight;
	player.canvas.width = player.playerWidth;
	player.render = player.canvas.getContext('2d');
	
	player.render.fillStyle = "#FFFFFF";
	player.render.fillRect(0,0,player.canvas.width,player.canvas.height); //ChangeSize clips a circle arc from this
	
	let spawnPosX = levelPosX; //default for battleMode
	let spawnPosY = levelPosY; //default for battleMode
	if(gameMode===GameMode.battle){
		let spawnPositions = [];
		let colWidth = Math.ceil(terrain.canvas.width/8);
		let colHeight = terrain.canvas.height;
		for(let cY = 0; cY < colHeight-31; cY+=8){ //finding all empty spots in the stage large enough for spawning (8x8 grid based, 32x32 minimum spawn area)
			spawnSearchLoop2:
			for(let cX = 0; cX < colWidth-4; cX++){
				if(terrain.colData[cY*colWidth+cX]===0){
					for(let cYs = 0; cYs < 32; cYs++){
						let col = (cY+cYs)*colWidth+cX;
						if(terrain.colData[col] + terrain.colData[col+1] + terrain.colData[col+2] + terrain.colData[col+3] > 0)
							continue spawnSearchLoop2;
					}
					spawnPositions.push({x:(cX << 3),y:cY}); //cX multiply by 8
				}
			}
		}
		if(spawnPositions.length>0){
			let randomSpot = Math.floor(Math.random() * spawnPositions.length);
			spawnPosX += spawnPositions[randomSpot].x;
			spawnPosY += spawnPositions[randomSpot].y;
		}
	}
	player.playerPosX = (gameMode===GameMode.battle) ? spawnPosX : 0;
	player.playerPosY = (gameMode===GameMode.battle) ? spawnPosY : 0;
	player.invulnerability = (gameMode===GameMode.battle) ? invulnerabilityLimit : 0;
	
	ChangeSize(0,player);
}
function ChangeSize(change, player){
	tempCanvas.height = player.playerHeight;
	tempCanvas.width = player.playerWidth;
	tempRender.drawImage(player.canvas,0,0);
	
	player.pixelCount=0;
	player.pixelCountMax+=2*change;
	player.sizeLevel+=2*change;
	player.playerHeight+=2*change;
	player.playerWidth+=2*change;
	
	player.canvas.height = player.playerHeight;
	player.canvas.width = player.playerWidth;
	
	player.playerRadius = player.playerHeight/2;

	player.render.beginPath();
	player.render.arc(player.playerRadius,player.playerRadius,player.playerRadius-1,0,2*Math.PI); //circle clipping area
	player.render.clip();

	player.render.drawImage(tempCanvas, change, change);

	player.playerPosX-=change;
	player.playerPosY-=change;
	
	player.colMiddle = player.playerRadius;
	player.colRadius = player.colMiddle-4; //4 pixel offset
	player.colTop = player.colRadius*(-0.9)+player.colMiddle;
	player.colBottom = player.colRadius*0.9+player.colMiddle;
	
	player.colPoints = []; //colValues are used only for terrain collision
	let angle=89;
	let angleStep=0;
	let flip=true;
	while(angle<269){
		angle += (flip) ? -angleStep : angleStep;
		flip = !flip;
		angleStep++;
		
		let radians = angle*degToRad;
		let colX = player.colRadius*Math.cos(radians)+player.colMiddle;
		let colY = player.colRadius*(-Math.sin(radians))+player.colMiddle;
		player.colPoints.push({x:colX,y:colY});
	}
}
function CreateShot(player){
	let newBall = player.Balls[
		player.Balls.push({
			ballPosX:0,
			ballPosY:0,
			ballRadius:0,
			ballSize:0,
			canvas:null,
			collided:false,
			firstColCheck:true,
			hitCount:0,
			hitLimit:100,
			isMoving:false,
			level:0,
			player:player,
			render:null,
			Sounds:{
				shot:new Audio(Sounds.shot.src)
			},
			Vectors:[],
			Xdirection:0,
			Ydirection:0
		})-1
	];

	newBall.canvas = document.createElement('canvas');
	newBall.canvas.width = 1;
	newBall.canvas.height = 1;
	newBall.render = newBall.canvas.getContext('2d');
	newBall.render.clearRect(0, 0, 1, 1); //is this needed?
	
	return newBall;
}
function RemoveShot(ball){
	let player = ball.player;
	
	StopLoops(ball.Sounds);
	player.Balls.splice(player.Balls.indexOf(ball),1);
}
function ChargeShot(change, ball){
	let player = ball.player;
	
	if(ball.ballSize===0){
		player.copyCanvas.height = player.playerHeight;
		player.copyCanvas.width = player.playerWidth;
		player.copyRender.drawImage(player.canvas,0,0);
	}
	ball.hitLimit+=2*change;
	ball.ballSize+=2*change;

	ball.canvas.height = ball.ballSize;
	ball.canvas.width = ball.ballSize;
	
	ball.ballRadius = ball.ballSize/2;
	
	ball.render.drawImage(player.copyCanvas, 0, 0, ball.ballSize, ball.ballSize);
}
function PlayerHit(player, enemy){
	if(gameMode===GameMode.adventure){
		player.pixelCount+=1;
		if(player.pixelCount>=player.pixelCountMax)
			ChangeSize(1,player);
	} else if(player.invulnerability <= 0){
		player.pixelCount-=2; //enemy shots decrease size at double rate
		if(player.pixelCount<=0){
			ChangeSize(-1,player);
			player.pixelCount = player.pixelCountMax;
			if(player.sizeLevel <= -10){
				PlaySound(player.Sounds.death);
				if(player.Balls.length > 0){ //removing unshot ball
					let latestBall = player.Balls[player.Balls.length-1];
					if(!latestBall.isMoving)
						RemoveShot(latestBall);
				}
				if(gameType===GameType.score){
					//player.score = Math.max(player.score-1,0);
					enemy.score++;
					if(enemy.score>=winScore)
						return true;
					
					enemy.statusVisibility=statusVisibilityLimit;
				} else {
					player.lives--;
					if(player.lives<=0){
						player.score-=IngamePlayers.length-1; //for ranking (4th:-3, 3rd:-2, 2nd:-1, 1st:0)
						return true;
					}
					player.statusVisibility=statusVisibilityLimit;
				}
				InitializePlayer(player,false);
			}
		}
	}
	return false;
}
function CircleOverlap(distanceX, distanceY, radius){ //(slightly) optimized circle collision
	distanceX = Math.abs(distanceX);
	distanceY = Math.abs(distanceY);
	
	if(distanceX+distanceY <= radius) //inside square diamond
		return true;
	if(Math.pow(distanceX,2)+Math.pow(distanceY,2) <= Math.pow(radius,2)) //inside circle
		return true;
	
	return false;
}
function CreateColVectors(ball){
	let radius = ball.ballRadius;
	
	ballY = Math.floor(radius*ball.Ydirection+radius);
	ballX = Math.floor(radius*ball.Xdirection+radius);
	
	let endY = Math.floor(radius*(-ball.Ydirection)+radius);
	let endX = Math.floor(radius*(-ball.Xdirection)+radius);
	
	let Ystep = (ballY<endY) ? 1 : -1; //or Math.sign(endY - ballY)
	let Xstep = (ballX<endX) ? 1 : -1; //or Math.sign(endX - ballX)
	
	let Ydir = -Math.abs(endY - ballY);
	let Xdir = Math.abs(endX - ballX);
	
	let dirError = Xdir+Ydir;
	
	ball.Vectors = [];
	ball.Vectors.push([]);
	ball.Vectors[0].push({x:ballX,y:ballY,index:0});
	
	let blockCount = 1;
	
	while(ballX !== endX || ballY !== endY){ //Bresenham's line algorithm
		let dirError2 = dirError*2;
		if(dirError2 >= Ydir){
			ballX+=Xstep;
			dirError+=Ydir;
		}
		if(dirError2 <= Xdir){
			ballY+=Ystep;
			dirError+=Xdir;
		}
		
		ball.Vectors[0].push({x:ballX,y:ballY,index:blockCount});
		blockCount++;
	}
	
	let blockIndex = 0;
	let vectorIndex = 1;
	let refVectorIndex = 0;
	ball.Vectors.push([]);
	let flip = false;
	let repeatBlock = true;
	let UpDownFlip = Math.abs(ball.Xdirection)>Math.abs(ball.Ydirection);
	let newX=0;
	let newY=0;
	let ballNotFull = false;
	blockCount = 0;
	do{ //filling ball with vectors
		refVectorIndex = Math.max(0,vectorIndex-2);
		let block = ball.Vectors[refVectorIndex][blockIndex];
		ballX = block.x;
		ballY = block.y;
		
		if(UpDownFlip){
			if(repeatBlock)
				newX = (blockIndex===0) ? ballX-Xstep : ballX+Xstep;
			else
				newX = ballX;
		} else
			newX = (flip) ? (ballX-1) : (ballX+1);
		
		if(UpDownFlip)
			newY = (flip) ? (ballY-1) : (ballY+1);
		else {
			if(repeatBlock)
				newY = (blockIndex===0) ? ballY-Ystep : ballY+Ystep;
			else
				newY = ballY;
		}
		
		if(CircleOverlap(newX-radius, newY-radius, radius+1)){
			if(ball.Vectors.length-1 < vectorIndex)
				ball.Vectors.push([]);
			ball.Vectors[vectorIndex].push({x:newX,y:newY,index:blockCount});
			blockCount++;
			
			ballNotFull = true;
		}
		
		if(blockIndex >= ball.Vectors[refVectorIndex].length-1 && ballNotFull){
			if(repeatBlock){
				blockIndex=0;
				vectorIndex++;
				flip = !flip;
				ballNotFull = false;
				blockCount = 0;
			} else
				repeatBlock = true;
		} else {
			if(repeatBlock)
				repeatBlock = false;
			else
				blockIndex++;
		}
	} while(ballNotFull || blockIndex < ball.Vectors[refVectorIndex].length);
}
function SetClipPixel(object, x, y, level=null){
	let collided = (level===null) ? object.collided : object.collided[level];
	if(!collided){
		object.render.save();
		object.render.beginPath();
		if(level===null) object.collided = true;
		else object.collided[level] = true;
	}
	object.render.rect(x,y,1,1);
}
function BallBallCollision(ball1,ball2){
	let ball2Y = ball2.ballPosY+ball2.ballRadius;
	let ball2X = ball2.ballPosX+ball2.ballRadius;
	if(!CircleOverlap(ball2X-ballX, ball2Y-ballY, ball2.ballRadius+ball1.ballRadius+1))
		return;
	for(let v = 0; v < ball1.Vectors.length; v++){
		let ballVector = ball1.Vectors[v];
		if(ball2.isMoving){
			for(let v2 = 0; v2 < ball2.Vectors.length; v2++){
				let ballVector2 = ball2.Vectors[v2];
				
				let bX1 = ballVector[0].x, bX2 = ballVector[ballVector.length-1].x;
				let b2X1 = ballVector2[0].x, b2X2 = ballVector2[ballVector2.length-1].x;
				let bXmin = Math.min(bX1,bX2)+ball1.ballPosX;
				let bXmax = Math.max(bX1,bX2)+ball1.ballPosX;
				let b2Xmin = Math.min(b2X1,b2X2)+ball2.ballPosX;
				let b2Xmax = Math.max(b2X1,b2X2)+ball2.ballPosX;
				let xOverlap = (bXmin <= b2Xmax) && (b2Xmin <= bXmax);
				
				let bY1 = ballVector[0].y, bY2 = ballVector[ballVector.length-1].y;
				let b2Y1 = ballVector2[0].y, b2Y2 = ballVector2[ballVector2.length-1].y;
				let bYmin = Math.min(bY1,bY2)+ball1.ballPosY;
				let bYmax = Math.max(bY1,bY2)+ball1.ballPosY;
				let b2Ymin = Math.min(b2Y1,b2Y2)+ball2.ballPosY;
				let b2Ymax = Math.max(b2Y1,b2Y2)+ball2.ballPosY;
				let yOverlap = (bYmin <= b2Ymax) && (b2Ymin <= bYmax);
				
				if(xOverlap && yOverlap){ //vector-vector (line-line) collision
					while(ballVector.length > 0){
						let levelInfo = UpdateLevelData(ball1.level,ballLevelX+ballVector[0].x,ballLevelY+ballVector[0].y);
						ball1.level = levelInfo.level;
						let levelX = levelInfo.levelX;
						let levelY = levelInfo.levelY;
						
						if(levelX >= 0 && levelX < terrain.canvas.width && levelY >= 0 && levelY < terrain.canvas.height){ //pos is in bounds
							let levelPixel = levelY*terrain.canvas.width+levelX;
							
							SetLevelColData(levelPixel,true);
							
							SetClipPixel(terrain, levelX, levelY, ball1.level);
						}
						
						SetClipPixel(ball1, ballVector[0].x, ballVector[0].y);
						
						ballVector.splice(0,1); //removing empty block
					}
					break;
				}
			}
		} else { //ball-shield
			for(let i = 0; i < ballVector.length; i+=updateInterval){
				let ballBlockY = ball1.ballPosY+ballVector[i].y;
				let ballBlockX = ball1.ballPosX+ballVector[i].x;
				if(CircleOverlap(ball2X-ballBlockX, ball2Y-ballBlockY, ball2.ballRadius)){
					ball2.hitCount+=1;
					if(ball2.hitCount>=ball2.hitLimit){
						if(gameMode===GameMode.adventure)
							ChargeShot(1, ball2);
						else
							ChargeShot(-1, ball2);
						ball2.hitCount=0;
					}
					
					SetClipPixel(ball1, ballVector[i].x, ballVector[i].y);
					
					ballVector.splice(i,1); //removing empty block
					i-=updateInterval;
				}
			}
		}
	}
}
function BallPlayerCollision(ball,player){
	let playerY = player.playerPosY+player.playerRadius;
	let playerX = player.playerPosX+player.playerRadius;
	if(!CircleOverlap(playerX-ballX, playerY-ballY, player.playerRadius+ball.ballRadius+1))
		return false;
	for(let v = 0; v < ball.Vectors.length; v++){
		let ballVector = ball.Vectors[v];
		for(let i = 0; i < ballVector.length; i+=updateInterval){
			let ballBlockY = ball.ballPosY+ballVector[i].y;
			let ballBlockX = ball.ballPosX+ballVector[i].x;
			if(CircleOverlap(playerX-ballBlockX, playerY-ballBlockY, player.playerRadius)){
				SetClipPixel(ball, ballVector[i].x, ballVector[i].y);
				
				ballVector.splice(i,1); //removing empty block
				i-=updateInterval;
				
				if(PlayerHit(player, ball.player))
					return true;
			}
		}
	}
	return false;
}
function BallTerrainCollision(ball,ballPosDiff){
	let blockStep = (ball.firstColCheck) ? updateInterval : 1;
	for(let v = 0; v < ball.Vectors.length; v++){
		let ballVector = ball.Vectors[v];
		let ballPosStep = 0;
		for(let i = 0; i < ballVector.length; i+=blockStep){
			if(!ball.firstColCheck){
				ballPosStep++;
				if(ballPosStep>ballPosDiff) //diagonal vectors have less pixels per distance, so ballPosDiff is unnecessarily long for those vectors (not a big deal tho)
					break;
			}
			let levelInfo = UpdateLevelData(ball.level,ballLevelX+ballVector[i].x,ballLevelY+ballVector[i].y);
			ball.level = levelInfo.level;
			let levelX = levelInfo.levelX;
			let levelY = levelInfo.levelY;
			
			let outOfBounds = false;
			let levelPixel = -1;
			if(levelX < 0 || levelX >= terrain.canvas.width || levelY < 0 || levelY >= terrain.canvas.height){
				if(!noBounds){
					outOfBounds = true;
					levelY = Clamp(levelY, 0, terrain.canvas.height-1); //Clamping Y-position in bounds
					levelX = Clamp(levelX, 0, terrain.canvas.width-1); //Clamping X-position in bounds
					levelPixel = levelY*terrain.canvas.width+levelX;
				}
			} else
				levelPixel = levelY*terrain.canvas.width+levelX;
			
			if(GetLevelColData(levelPixel)!==0 || outOfBounds){ //if ball hits level-terrain or is out of bounds
				if(noPile){
					SetLevelColData(levelPixel,false);
					terrain.render.clearRect(levelX, levelY, 1, 1 ); //removing a pixel from contactpoint
					
					if(outOfBounds){
						SetClipPixel(ball, ballVector[i].x, ballVector[i].y);
						
						ballVector.splice(i,1);
						i--;
					}
					continue;
				}
				let blockCounter = ballVector[i].index;
				while(i < ballVector.length){
					if(ballVector[i].index!==blockCounter) //there's a gap in the vector
						break;
					
					blockCounter++;
					
					levelInfo = UpdateLevelData(ball.level,ballLevelX+ballVector[i].x,ballLevelY+ballVector[i].y);
					ball.level = levelInfo.level;
					levelX = levelInfo.levelX;
					levelY = levelInfo.levelY;
					
					if(levelX >= 0 && levelX < terrain.canvas.width && levelY >= 0 && levelY < terrain.canvas.height){ //pos is in bounds
						levelPixel = levelY*terrain.canvas.width+levelX;
						
						SetLevelColData(levelPixel,true);
						
						SetClipPixel(terrain, levelX, levelY, ball.level);
					}
					SetClipPixel(ball, ballVector[i].x, ballVector[i].y);
					
					ballVector.splice(i,1); //removing empty block
				}
				break;
			}
		}
	}
}
function PlayerTerrainCollision(player){
	player.onGround=false;
	terrain.ResetCollided();
	
	for(let i = 0; i < player.colPoints.length; i++){
		let blockX = player.colPoints[i].x;
		let blockY = player.colPoints[i].y;
		
		let levelInfo = UpdateLevelData(player.level,Math.floor(player.playerPosX-levelPosX+blockX),Math.floor(player.playerPosY-levelPosY+blockY));
		player.level = levelInfo.level;
		let levelX = levelInfo.levelX;
		let levelY = levelInfo.levelY;
		
		let levelPixel = -1;
		let outOfBounds = false;
		
		if(levelX>=0 && levelX<terrain.canvas.width && levelY>=0 && levelY<terrain.canvas.height) //in bounds
			levelPixel = levelY*terrain.canvas.width+levelX;
		else if(!noBounds){ //out of bounds
			outOfBounds = true;
			if(levelX<-player.colMiddle){
				player.playerPosX-=levelX;
				player.momentumX = Math.max(player.momentumX,0);
			} else if(levelX>=terrain.canvas.width+player.colMiddle){
				player.playerPosX-=levelX-(terrain.canvas.width-1);
				player.momentumX = Math.min(player.momentumX,0);
			} if(levelY<-player.colMiddle){
				player.playerPosY-=levelY;
				player.momentumY = Math.max(player.momentumY,0);
			} else if(levelY>=terrain.canvas.height+player.colMiddle){
				player.playerPosY-=levelY-(terrain.canvas.height-1);
				player.momentumY = Math.min(player.momentumY,0);
			}
		}
		if(GetLevelColData(levelPixel)!==0 || outOfBounds){ //if player hits level-terrain
			if(blockY<player.colMiddle){ //pixels from halfway upwards
				if(blockY<player.colTop){
					if(player.momentumY<0){
						player.momentumY = Math.min(player.momentumY+momentumChange*4,0);
						player.onGround = true;
					}
					
					if(!infiniteJump)
						player.jumpTimer = jumpLimit;
					
					player.playerPosY += positionCorrection;
				} else {
					player.momentumX += (blockX<player.colMiddle) ? momentumChange : -momentumChange;
					player.momentumY += momentumChange;
					//alternative
					//player.momentumX -= (blockX-player.colMiddle)/player.colMiddle*momentumChange;
					//player.momentumY -= (blockY-player.colMiddle)/player.colMiddle*momentumChange;
				}
			} else { //pixels from halfway downwards
				if(blockY>player.colBottom){
					player.onGround = true;
					player.jumpTimer = 0;
					if(player.momentumY>0)
						player.momentumY = Math.max(player.momentumY-momentumChange*4,0);
					
					if(player.momentumX===0)
						player.rotMomentum = 0;
					
					player.playerPosY -= positionCorrection;
				} else {
					if(wallJump && !outOfBounds)
						player.jumpTimer = 0;
					
					player.momentumX += (blockX<player.colMiddle) ? momentumChange : -momentumChange;
					player.momentumY -= momentumChange;
					//alternative (player slows down when going up slopes)
					//player.momentumX -= (blockX-player.colMiddle)/player.colMiddle*momentumChange;
					//player.momentumY -= (blockY-player.colMiddle)/player.colMiddle*momentumChange;
				}
			}
			if((collectCharge || !player.charging) && !player.chargeHold){ //OR "if((collectCharge && !player.chargeHold) || !player.charging)"?
				if(player.rotMomentum!==0 && !outOfBounds){ //can't collect snow without rotating
					if(!noGrow){
						if(!terrain.collided[player.level]){
							let xOffset = 0;
							let yOffset = 0;
							if(gameMode===GameMode.adventure){
								xOffset = Levels[player.level].xOffset;
								yOffset = Levels[player.level].yOffset;
							}
							player.render.drawImage(terrain.canvas,
							Math.floor(levelPosX-player.playerPosX+xOffset), //xOffset is always 0 in battleMode
							Math.floor(levelPosY-player.playerPosY+yOffset)); //yOffset is always 0 in battleMode
							terrain.collided[player.level] = true;
						}
						player.pixelCount += Math.ceil(speedMultiplier/2); //collects snow faster
						snowRate = SnowRate(1.002,0.05);
						if(player.pixelCount>=player.pixelCountMax) //how many pixels needs to be collected before growth
							ChangeSize(1,player);
					}
					if(!noCollect){
						terrain.render.clearRect(levelX, levelY, 1, 1 ); //removing a pixel from contactpoint
						SetLevelColData(levelPixel,false); //alternative: terrain.colData[terrainPixelIndex] &= ~terrainPixelMask;
					}
				}
			}
		}
	}
}
function CheckPlayerInsideTerrain(player,posDiffX,posDiffY){
	let posDiffSum = Math.hypot(posDiffX,posDiffY);
	let playerPosDiff = Math.floor(posDiffSum);
	
	if(playerPosDiff<=maxSpeed) //speed threshold (using maxSpeed because maxDropSpeed is too high)
		return;
	
	let posDirX = posDiffX/posDiffSum;
	let posDirY = posDiffY/posDiffSum;
	
	while(playerPosDiff>0){
		let blockX = player.colMiddle; //-posDirX*player.colMiddle+player.colMiddle
		let blockY = player.colMiddle; //-posDirY*player.colMiddle+player.colMiddle
		
		let levelInfo = UpdateLevelData(player.level,Math.floor(player.playerPosX-levelPosX+blockX),Math.floor(player.playerPosY-levelPosY+blockY));
		player.level = levelInfo.level;
		let levelX = levelInfo.levelX;
		let levelY = levelInfo.levelY;
		
		let levelPixel = -1;
		let outOfBounds = false;
		
		if(levelX>=0 && levelX<terrain.canvas.width && levelY>=0 && levelY<terrain.canvas.height) //in bounds
			levelPixel = levelY*terrain.canvas.width+levelX;
		else if(!noBounds) //out of bounds
			outOfBounds = true;
		
		if(GetLevelColData(levelPixel)===0 && !outOfBounds)
			break;
		
		player.playerPosX -= posDirX;
		player.playerPosY -= posDirY;
		player.momentumX -= posDirX; //or player.momentumX = 0?
		player.momentumY -= posDirY; //or player.momentumY = 0?
		playerPosDiff--;
	}
}
function GameLogic(){
for(let step = steps; step >= 1; step--){
	for(let p = 0; p < IngamePlayers.length; p++){
		let player = IngamePlayers[p];

		if(player.left){
			if(noClip)
				player.playerPosX -= maxSpeed*player.leftValue;
			else if(player.momentumX > -maxSpeed*player.leftValue) //can go faster with knockBack
				player.momentumX = Math.max(player.momentumX-acceleration,-maxSpeed*player.leftValue);
		} else if(player.right){
			if(noClip)
				player.playerPosX += maxSpeed*player.rightValue;
			else if(player.momentumX < maxSpeed*player.rightValue) //can go faster with knockBack
				player.momentumX = Math.min(player.momentumX+acceleration,maxSpeed*player.rightValue);
		}
		if(player.jump){
			if(player.momentumY>jumpForce){
				if(!infiniteJump){
					player.jumpTimer+=speedMultiplier; //or +=updateInterval?
					if(player.jumpTimer>=jumpLimit){
						if(!wallJump)
							player.jump = false;
						player.jumpTimer=jumpLimit;
					}
				} else
					player.jumpTimer=0;
				
				if(player.jumpTimer<jumpLimit)
					player.momentumY = jumpForce;
			}
		}
		if(player.onGround){
			if(player.momentumX < 0)
				player.momentumX = Math.min(player.momentumX+friction,0);
			else if(player.momentumX > 0)
				player.momentumX = Math.max(player.momentumX-friction,0);
		}
		if(player.invulnerability > 0)
			player.invulnerability-=speedMultiplier; //or -=updateInterval (so gameSpeed doesn't affect time)
		if(player.statusVisibility > 0)
			player.statusVisibility-=speedMultiplier; //or -=updateInterval (so gameSpeed doesn't affect time)
		if(player.up){
			if(noClip)
				player.playerPosY -= maxSpeed*player.upValue;
		} else if(player.down){
			if(noClip)
				player.playerPosY += maxSpeed*player.downValue;
		}
		let ball = (player.Balls.length > 0) ? player.Balls[player.Balls.length-1] : null;
		if(player.charging){
			if(player.sizeLevel>0 && !player.chargeHold){
				if(ball === null || ball.isMoving)
					ball = CreateShot(player);

				if(instantCharge){
					ChargeShot(player.sizeLevel/2, ball);
					ChangeSize(-player.sizeLevel/2, player);
				} else {
					player.chargeCount+=player.chargeValue*speedMultiplier; //or *updateInterval?
					let chargeAmount = Math.floor(Math.min(player.chargeCount/chargeInterval,player.sizeLevel/2));
					if(chargeAmount>=1){
						ChargeShot(chargeAmount, ball);
						ChangeSize(-chargeAmount, player);
						player.chargeCount -= chargeAmount*chargeInterval;
					}
				}
				LoopSound(player.Sounds.charge,player.chargeValue);
			} else
				LoopSound(player.Sounds.charge,0);
			if(ball !== null && !ball.isMoving){
				//calculating the aiming direction
				if(!player.aimCentered){
					ball.Xdirection=player.aimX-player.playerPosX-player.playerRadius;
					ball.Ydirection=player.aimY-player.playerPosY-player.playerRadius;
				} else { //drag ball behind the player
					ball.Xdirection=-player.momentumX;
					if(Math.abs(player.momentumY)>momentumThreshold*20)
						ball.Ydirection=-player.momentumY;
					else
						ball.Ydirection=Math.abs(player.momentumY); //shoots downwards
				}
				let positionSum=Math.hypot(ball.Xdirection,ball.Ydirection);
				if(positionSum>0){
					ball.Xdirection=ball.Xdirection/positionSum;
					ball.Ydirection=ball.Ydirection/positionSum;
				} else {
					ball.Xdirection=0;
					ball.Ydirection=1; //shoots downwards as a failsafe
				}
			}
		} else if(ball !== null && !ball.isMoving){
			StopLoop(player.Sounds.charge);
			
			if(ball.ballSize>0){
				CreateColVectors(ball);
				
				if(!noKnockback){
					let knockBackStrength = ball.ballSize*knockBackForce*(shotSpeed*shotSpeed/25);
					player.momentumX -= ball.Xdirection*knockBackStrength;
					player.momentumY -= ball.Ydirection*knockBackStrength;
				}
				ball.isMoving = true;
				PlaySound(ball.Sounds.shot);
			} else {
				RemoveShot(ball);
			}
		}
		if(!player.onGround){
			if(player.momentumY<maxDropSpeed) //can drop faster with knockBack
				player.momentumY = Math.min(player.momentumY+dropAcceleration,maxDropSpeed);
		}
		if(!noClip){
			let prevPlayerPosX = player.playerPosX;
			let prevPlayerPosY = player.playerPosY;
			
			player.playerPosX += player.momentumX;
			player.playerPosY += player.momentumY;
			
			CheckPlayerInsideTerrain(player,player.playerPosX-prevPlayerPosX,player.playerPosY-prevPlayerPosY); //push player out of terrain (halfway)
			
			PlayerTerrainCollision(player);
		} else {
			if(gameMode===GameMode.adventure) //update player.level even in noClip
				player.level = FindLevel(player.level,Math.floor(player.playerPosX-levelPosX+player.colMiddle),Math.floor(player.playerPosY-levelPosY+player.colMiddle));
			
			player.momentumX = 0;
			player.momentumY = 0;
			player.jumpTimer = 0;
			player.onGround = false;
		}
		if(player.momentumX!==0 || player.rotMomentum!==0){ //rotation render
			if(player.onGround){
				if(Math.abs(player.momentumX)<momentumThreshold)
					player.rotMomentum = 0;
				else {
					player.rotMomentum = player.momentumX;
					player.rotMomentum += Math.sign(player.momentumX)*Math.abs(player.momentumY); //Y-momentum adds some extra rotation
				}
			} else {
				if(player.rotMomentum!==0)
					player.rotMomentum -= Math.sign(player.rotMomentum)*momentumChange;
				if(Math.abs(player.rotMomentum)<momentumThreshold)
					player.rotMomentum = 0;
			}
			if(player.rotMomentum!==0){
				player.render.setTransform(1, 0, 0, 1, 0, 0);
				tempCanvas.height = player.playerHeight;
				tempCanvas.width = player.playerWidth;
				tempRender.drawImage(player.canvas,0,0);
				player.render.translate(player.playerRadius,player.playerRadius);
				player.render.rotate(player.rotMomentum*degToRad);
				player.render.translate(-player.playerRadius,-player.playerRadius);
				player.render.drawImage(tempCanvas, 0, 0 );
			}
		}
	}
	for(let p = 1; p < Players.length; p++){ //using Players instead of IngamePlayers so that shots won't disappear when a player loses all their lives
		let player = Players[p];
		if(!player.joined)
			continue;
		
		for(let b = 0; b < player.Balls.length; b++){
			let ball = player.Balls[b];
			if(!ball.isMoving)
				continue;
			
			terrain.ResetCollided();

			let prevBallPosX = ball.ballPosX;
			let prevBallPosY = ball.ballPosY;
			
			ball.ballPosX+=ball.Xdirection*(ballSpeed*(shotSpeed*shotSpeed/25));
			ball.ballPosY+=ball.Ydirection*(ballSpeed*(shotSpeed*shotSpeed/25));
			
			let ballPosDiff = Math.ceil(Math.hypot(ball.ballPosX-prevBallPosX,ball.ballPosY-prevBallPosY))+1;
			
			//these are pre-calculated here so that they don't have to be recalculated multiple times in BallCollision-functions
			ballY = ball.ballPosY+ball.ballRadius;
			ballX = ball.ballPosX+ball.ballRadius;
			ballLevelY = Math.floor(ball.ballPosY-levelPosY);
			ballLevelX = Math.floor(ball.ballPosX-levelPosX);

			ball.collided = false;
			
			for(let op = 0; op < IngamePlayers.length; op++){
				let otherPlayer = IngamePlayers[op];
				if(otherPlayer.number===player.number)
					continue;
				
				if(!noPile)
					for(let b2 = 0; b2 < otherPlayer.Balls.length; b2++)
						BallBallCollision(ball,otherPlayer.Balls[b2]);
				
				if(BallPlayerCollision(ball,otherPlayer)){ //if GameOver or player dies
					if(gameType===GameType.score){
						Results();
						return;
					}
					IngamePlayers.splice(op,1);
					op--;
					if(IngamePlayers.length<=1){
						Results();
						return;
					}
				}
			}
			
			BallTerrainCollision(ball,ballPosDiff);
			
			ball.firstColCheck = false;
			if(ball.collided){
				snowRate = SnowRate(1.02,0.5);
				let collidedLength = gameMode===GameMode.adventure ? terrain.collided.length : 1;
				for(let l = 0; l < collidedLength; l++){
					if(terrain.collided[l]){
						let xOffset = 0;
						let yOffset = 0;
						if(gameMode===GameMode.adventure){
							xOffset = Levels[l].xOffset;
							yOffset = Levels[l].yOffset;
							terrain.render = Levels[l].render;
						}
						terrain.render.clip();
						terrain.render.drawImage(ball.canvas,ballLevelX-xOffset,ballLevelY-yOffset);
						terrain.render.restore();
					}
				}
				ball.render.clip();
				ball.render.clearRect(0,0,ball.canvas.width,ball.canvas.height);
				ball.render.restore();
				
				for(let v = 0; v < ball.Vectors.length; v++){ //removing empty vectors
					if(ball.Vectors[v].length===0){
						ball.Vectors.splice(v,1);
						v--;
					}
				}
				if(ball.Vectors.length===0){ //all vectors collided
					RemoveShot(ball);
					b--;
				}
			}
		}
	}
	snowRate = SnowRate(0.98,0);
}
	LoopSound(Sounds.snow,snowRate);
	
	if(fixedCamera){
		let xOffset = 0;
		let yOffset = 0;
		let areaCanvas = terrain.canvas;
		if(gameMode===GameMode.adventure){
			let l = Players[firstJoined].level;
			xOffset = Levels[l].xOffset;
			yOffset = Levels[l].yOffset;
			areaCanvas = Levels[l].canvas;
		}
		areaScale = Math.min(screenWidth/areaCanvas.width,screenHeight/areaCanvas.height);
		let levelOffsetX = (screenWidth/areaScale-areaCanvas.width)/2-xOffset;
		let levelOffsetY = (screenHeight/areaScale-areaCanvas.height)/2-yOffset;
		for(let p = 1; p < Players.length; p++){
			if(!Players[p].joined)
				continue;
			
			for(let b = 0; b < Players[p].Balls.length; b++){
				Players[p].Balls[b].ballPosX -= levelPosX-levelOffsetX;
				Players[p].Balls[b].ballPosY -= levelPosY-levelOffsetY;
			}
			Players[p].playerPosX -= levelPosX-levelOffsetX;
			Players[p].playerPosY -= levelPosY-levelOffsetY;
		}
		levelPosX = levelOffsetX;
		levelPosY = levelOffsetY;
	} else {
		let minX=0,minY=0,maxX=0,maxY=0;
		for(let p = 0; p < IngamePlayers.length; p++){ //finding the middlepoint between players
			let player = IngamePlayers[p];

			if(p===0){
				minX = player.playerPosX;
				maxX = player.playerPosX+player.playerWidth;
				minY = player.playerPosY;
				maxY = player.playerPosY+player.playerHeight;
			} else {
				minX = Math.min(player.playerPosX,minX);
				maxX = Math.max(player.playerPosX+player.playerWidth,maxX);
				minY = Math.min(player.playerPosY,minY);
				maxY = Math.max(player.playerPosY+player.playerHeight,maxY);
			}
		}
		/*if(!noCameraBounds){
			areaScale = Math.min(screenWidth,screenHeight)/(Math.min(terrain.canvas.width,terrain.canvas.height)/2);
			let newAreaScale1 = (screenWidth*aimMargin)/Math.min((maxX-minX),terrain.canvas.width*aimMargin);
			let newAreaScale2 = (screenHeight*aimMargin)/Math.min((maxY-minY),terrain.canvas.height*aimMargin);
			areaScale = Math.min(areaScale,newAreaScale1,newAreaScale2);
		} else {*/
		areaScale = Math.min(screenWidth,screenHeight)/aimArea;
		let newAreaScale1 = (screenWidth*aimMargin)/(maxX-minX);
		let newAreaScale2 = (screenHeight*aimMargin)/(maxY-minY);
		areaScale = Math.min(areaScale,newAreaScale1,newAreaScale2);

		let playersCenterX = (minX+maxX)/2;
		let playersCenterY = (minY+maxY)/2;
		
		let scaledMiddlePointX = middlePointX/areaScale; //middlePoint/areaScale converts screen center to logical center
		let scaledMiddlePointY = middlePointY/areaScale;
		
		let xPositionChange = scaledMiddlePointX-playersCenterX;
		let yPositionChange = scaledMiddlePointY-playersCenterY;
		
		/*if(!noCameraBounds){
			if(terrain.canvas.width*areaScale > screenWidth){
				if(levelPosX+xPositionChange > 0)
					xPositionChange -= levelPosX+xPositionChange;
				else if(levelPosX+xPositionChange < screenWidth/areaScale-terrain.canvas.width)
					xPositionChange -= (levelPosX+xPositionChange)-(screenWidth/areaScale-terrain.canvas.width);
			} else
				xPositionChange -= (levelPosX+xPositionChange)-(screenWidth/areaScale-terrain.canvas.width)/2;
			if(terrain.canvas.height*areaScale > screenHeight){
				if(levelPosY+yPositionChange > 0)
					yPositionChange -= levelPosY+yPositionChange;
				else if(levelPosY+yPositionChange < screenHeight/areaScale-terrain.canvas.height)
					yPositionChange -= (levelPosY+yPositionChange)-(screenHeight/areaScale-terrain.canvas.height);
			} else
				yPositionChange -= (levelPosY+yPositionChange)-(screenHeight/areaScale-terrain.canvas.height)/2;
		}*/
		levelPosX += xPositionChange;
		levelPosY += yPositionChange;
		for(let p = 1; p < Players.length; p++){
			if(!Players[p].joined)
				continue;

			for(let b = 0; b < Players[p].Balls.length; b++){
				Players[p].Balls[b].ballPosX += xPositionChange;
				Players[p].Balls[b].ballPosY += yPositionChange;
			}
			Players[p].playerPosX += xPositionChange;
			Players[p].playerPosY += yPositionChange;
		}
	}
	for(let p = 0; p < IngamePlayers.length; p++){
		let player = IngamePlayers[p];

		Aim(player); //update AimX/Y
		if(player.Balls.length > 0){
			let ball = player.Balls[player.Balls.length-1];
			if(!ball.isMoving){
				ball.ballPosX=player.playerPosX+player.playerRadius+(ball.Xdirection*(ball.ballRadius+player.playerRadius))-ball.ballRadius;
				ball.ballPosY=player.playerPosY+player.playerRadius+(ball.Ydirection*(ball.ballRadius+player.playerRadius))-ball.ballRadius;
			}
		}
	}
	//Rendering everything
	if(!noBounds){
		gameRender.fillStyle = "#00000020"; //Out of bounds area color
		gameRender.fillRect(0, 0, screenWidth, screenHeight); //Out of bounds area
	}
	
	if(gameMode===GameMode.adventure){
		for(let l = 0; l < Levels.length; l++){ //floor(pos) and ceil(size) prevent vertical lines (Out of bounds area color)
			let scaledLevelPosX = Math.floor((levelPosX+Levels[l].xOffset)*areaScale), scaledLevelPosY = Math.floor((levelPosY+Levels[l].yOffset)*areaScale);
			let scaledLevelWidth = Math.ceil(Levels[l].canvas.width*areaScale), scaledLevelHeight = Math.ceil(Levels[l].canvas.height*areaScale);
			if(scaledLevelPosX<screenWidth && scaledLevelPosX+scaledLevelWidth>0 && scaledLevelPosY<screenHeight && scaledLevelPosY+scaledLevelHeight>0){ //off-screen canvases are not rendered
				gameRender.clearRect(scaledLevelPosX, scaledLevelPosY, scaledLevelWidth, scaledLevelHeight);
				gameRender.drawImage(Levels[l].canvas,0,0,Levels[l].canvas.width,Levels[l].canvas.height,scaledLevelPosX,scaledLevelPosY,scaledLevelWidth,scaledLevelHeight);
			}
		}
	} else {
		let scaledLevelPosX = levelPosX*areaScale, scaledLevelPosY = levelPosY*areaScale;
		let scaledLevelWidth = terrain.canvas.width*areaScale, scaledLevelHeight = terrain.canvas.height*areaScale;
		
		gameRender.clearRect(scaledLevelPosX, scaledLevelPosY, scaledLevelWidth, scaledLevelHeight);
		gameRender.drawImage(terrain.canvas,0,0,terrain.canvas.width,terrain.canvas.height,scaledLevelPosX,scaledLevelPosY,scaledLevelWidth,scaledLevelHeight);
	}
	
	if(IngamePlayers.length>1){
		gameRender.lineWidth = 3*guiScale;
		gameRender.setLineDash([]);
	}
	for(let p = 0; p < IngamePlayers.length; p++){
		let player = IngamePlayers[p];

		if(player.invulnerability > 0)
			gameRender.globalAlpha = 0.5;
		gameRender.drawImage(player.canvas,0,0,player.playerWidth,player.playerHeight,player.playerPosX*areaScale,player.playerPosY*areaScale,player.playerWidth*areaScale,player.playerHeight*areaScale);
		if(IngamePlayers.length>1){
			gameRender.beginPath();
			gameRender.arc((player.playerPosX+player.playerRadius)*areaScale,(player.playerPosY+player.playerRadius)*areaScale,(player.playerRadius)*areaScale,0,2*Math.PI);
			gameRender.strokeStyle=PlayerColors[player.number].color;
			gameRender.stroke();
		}
		gameRender.globalAlpha = 1;
	}
	for(let p = 1; p < Players.length; p++){
		let player = Players[p];
		if(!player.joined)
			continue;
		
		for(let b = 0; b < player.Balls.length; b++)
			gameRender.drawImage(player.Balls[b].canvas,0,0,player.Balls[b].canvas.width,player.Balls[b].canvas.height,player.Balls[b].ballPosX*areaScale,player.Balls[b].ballPosY*areaScale,player.Balls[b].canvas.width*areaScale,player.Balls[b].canvas.height*areaScale);
	}
	gameRender.lineWidth = 3*guiScale;
	gameRender.setLineDash([5*guiScale,10*guiScale]);
	for(let p = 0; p < IngamePlayers.length; p++){
		let player = IngamePlayers[p];

		if(!player.aimCentered){
			gameRender.beginPath();
			gameRender.moveTo((player.playerPosX+player.playerRadius)*areaScale,(player.playerPosY+player.playerRadius)*areaScale);
			gameRender.lineTo(player.aimX*areaScale,player.aimY*areaScale);
			gameRender.strokeStyle=PlayerColors[player.number].color;
			gameRender.stroke();
			let crossOffsetX = Crosshair[player.number].xOffset;
			let crossOffsetY = Crosshair[player.number].yOffset;
			gameRender.drawImage(Crosshair[player.number],0,0,crossOffsetX*2,crossOffsetY*2,(player.aimX*areaScale)-crossOffsetX*guiScale,(player.aimY*areaScale)-crossOffsetY*guiScale,crossOffsetX*2*guiScale,crossOffsetY*2*guiScale); //crosshair scales with resolution
			//gameRender.drawImage(Crosshair[player.number],(player.aimX*areaScale)-crossOffsetX,(player.aimY*areaScale)-crossOffsetY); //crosshair does not scale with resolution
		}
	}
	if(gameMode===GameMode.battle){
		for(let p = 0; p < IngamePlayers.length; p++){
			let player = IngamePlayers[p];

			if(player.statusVisibility > 0){
				gameRender.fillStyle=PlayerColors[player.number].color;
				gameRender.font=Math.max(player.playerHeight*areaScale,30)+"px Arial";
				gameRender.textAlign="center";
				gameRender.fillText(((gameType===GameType.score) ? player.score : player.lives),(player.playerPosX+player.playerRadius)*areaScale,player.playerPosY*areaScale);
			}
		}
	}
}
let logo = [
[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,0,0,0,1,0,1,1,1,0,0,1,1,1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,1,1,0,0,1,1,1,0,0,1,1,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,1,1,0,0,1,0,0,1,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,1,1,1,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,1,1,1,0,1,0,0,0,1,1,1,1,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,1,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,1,1,1,1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,1,0,0,1,0,0,1,1,1,0,1,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1]
];
let adventureText = [
[0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,1,0,0,1,1,0,1,0,1,0,0,1,0,0,1,1,0,0,1,1,1,0,1,0,1,0,1,1,1,0,0,1,0],
[1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,1,0,0,1,0,1],
[1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,0,0,1,1,1],
[1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,0,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let startText = [
[0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,0,0,1,1,1,0,0,1,1,0,1,1,1,0,1,1,1],
[0,1,0,0,0,1,0,0,1,0,1,0,1,1,0,0,0,1,0],
[0,0,1,0,0,1,0,0,1,1,1,0,1,0,0,0,0,1,0],
[1,1,0,0,0,1,1,0,1,0,1,0,1,0,0,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let battleText = [
[1,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
[1,0,1,0,0,1,1,0,1,1,1,0,1,1,1,0,1,0,0,1,0],
[1,1,1,0,1,0,1,0,0,1,0,0,0,1,0,0,1,0,1,0,1],
[1,0,1,0,1,1,1,0,0,1,0,0,0,1,0,0,1,0,1,1,1],
[1,1,0,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let gameTypeText = [
[0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,0,0,1,1,0,1,1,1,1,0,0,0,1,0,0,0,0,1,1,1,0,1,0,1,0,1,1,0,0,0,1,0],
[1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,0,0,0,1,0,0,1,1,1,0,1,0,1,0,1,1,1],
[0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,1,1,0,0,0,1,0,1,1,0,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,1,1]
];
let winScoreText = [
[1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,1,0,1,0,1,0,1,1,0,0,0,0,1,1,0,0,1,0,0,1,0,0,0,1,0,1,0,1],
[1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,1,0,0,1,1,1],
[1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
[0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let lifeCountText = [
[1,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0,1,0,0,1,0,1,0,1,1,0,0,1,1,1],
[1,0,0,0,1,0,1,1,0,0,1,1,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[1,1,1,0,1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,1,0,0,0,1,1,0,1,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let shotSpeedText = [
[0,1,1,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
[1,0,0,0,1,1,0,0,0,1,0,0,1,1,1,0,0,0,1,1,0,1,1,0,0,1,0,1,0,1,0,1,0,0,1,1],
[0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
[0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
[1,1,0,0,1,0,1,0,0,1,0,0,0,1,1,0,0,0,1,1,0,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let infiniteJumpText = [
[1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,1,0,0,1,0,0,1,0,1,1,0,0,1,0,1,1,1,0,0,1,0,0,0,0,0,0,1,0,1,0,1,0,1,1,1,1,0,0,1,1,0],
[1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,1,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1,1,0,1,0,0,0,0,0,0,1,0,0,0,1,1,0,1,0,1,0,1,0,1,1,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]
];
let knockBackText = [
[1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
[1,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1,1,0,0,0,1,1,0,0,1,0,1,0,1],
[1,1,1,1,0,1,0,1,0,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0],
[1,0,1,1,0,1,0,1,0,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,0,1,0,1,1,1,0,1,0,0,1,1,0],
[1,0,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,0,1,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let instantChargeText = [
[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,1,1,0,0,1,1,0,1,1,1,0,0,1,1,0,1,1,0,0,1,1,1,0,0,0,0,1,0,1,1,0,0,0,1,1,0,0,1,0,1,1,1,0,1,0,1],
[1,0,1,0,1,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,1,1],
[1,0,1,0,1,0,0,1,0,0,1,0,0,1,1,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,0,1,0,1,1,1,0,1,0,0,1,1,1,0,1,0,0],
[1,0,1,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0]
];
let fixedCameraText = [
[1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,0,0,1,1,0,1,1,1,1,0,0,1,0,1,0,0,1,0,0,1,1],
[1,1,1,0,1,0,0,1,0,0,1,1,1,0,1,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,1,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,1,1,1],
[1,0,0,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,1,0,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let noPile1Text = [
[0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
[1,0,0,0,1,1,0,0,0,1,0,0,0,1,0,0,1,1,1,0,0,0,1,1,1,0,1,1,0,0,0,1,0,0,1,0,0,1,0,1,0,1,1,1,0,1,1,0],
[0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
[1,1,0,0,1,0,1,0,0,1,0,0,0,1,0,0,0,1,1,0,0,0,0,1,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,1,0,0,0,1,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0]
];
let noPile2Text = [
[0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,1],
[1,1,1,0,1,0,1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,1],
[0,1,1,0,0,1,0,0,0,1,1,0,1,0,0,1,0,0,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0]
];
let stageSelectText = [
[0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,1,0],
[1,0,0,0,1,1,1,0,0,1,1,0,1,1,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1,1],
[0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,1,1,0,0,0,0,1,0,0,1,1,1,0,1,0,1,1,1,0,1,0,0,0,1,0],
[0,0,1,0,0,1,0,0,1,1,1,0,1,1,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0],
[1,1,0,0,0,1,1,0,1,0,1,0,0,0,1,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,1,0,0,1,1,0,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let optionsText = [
[0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,1,0,1,1,0,0,1,1,1,0,1,0,0,1,0,0,1,1,0,0,1,1,0],
[1,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0],
[1,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,1,1,0,0,1,1,0,0,0,1,1,0,1,0,0,1,0,0,1,0,1,0,1,1,0],
[0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let collisionQualityText = [
[0,1,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
[1,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,1,1,0,0,0,0,1,0,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,1,1],
[0,1,1,0,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,1,0,1,0,0,0,0,1,1,0,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0]
];
let soundVolumeText = [
[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,0,1,0,0,1,0,1,0,1,1,0,0,0,1,1,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,1,1,1,0,0,0,1,0],
[0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1],
[1,1,0,0,0,1,0,0,0,1,1,0,1,0,1,0,0,1,1,0,0,0,0,1,0,0,0,1,0,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let guiScaleText = [
[0,1,1,1,0,1,0,1,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0],
[1,0,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,1,0,1,0,0,1,0],
[1,0,1,1,0,1,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1],
[1,0,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0,1,1,1,0,1,0,1,1,1],
[0,1,1,1,0,0,1,1,0,1,0,0,1,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let vsyncText = [
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,0,0,0,1,1,0,1,0,1,0,1,1,0,0,0,1,1],
[1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,0],
[1,0,1,0,0,0,0,0,1,0,1,1,1,0,1,0,1,0,1,0,0],
[0,1,0,0,0,0,0,1,1,0,0,0,1,0,1,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0]
];
let Adjust = [
[0,0,1,0,0,0,0,0,0,0,0,1,0,0],
[0,1,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,0,0,0,0,0,0,0,0,0,0,0,1],
[0,1,0,0,0,0,0,0,0,0,0,0,1,0],
[0,0,1,0,0,0,0,0,0,0,0,1,0,0]
];
let Enable = [
[1,0,0,0,1],
[0,1,0,1,0],
[0,0,1,0,0],
[0,1,0,1,0],
[1,0,0,0,1]
];
let Disable = [
[0,0,0,0,0],
[0,0,0,0,0],
[0,0,0,0,0],
[0,0,0,0,0],
[0,0,0,0,0]
];
let Plus = [
[0,0,0,0,0],
[0,0,1,0,0],
[0,1,1,1,0],
[0,0,1,0,0],
[0,0,0,0,0]
];
let Minus = [
[0,0,0,0,0],
[0,0,0,0,0],
[0,1,1,1,0],
[0,0,0,0,0],
[0,0,0,0,0]
];
let Numbers = [
[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]], //Zero
[[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]], //One
[[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]], //Two
[[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]], //Three
[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]], //Four
[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]], //Five
[[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]], //Six
[[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]], //Seven
[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]], //Eight
[[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]] //Nine
];
let upKeyText = [
[1,0,0,1,0,0,0,0],
[1,0,0,1,0,1,1,0],
[1,0,0,1,0,1,0,1],
[1,0,0,1,0,1,0,1],
[0,1,1,0,0,1,1,0],
[0,0,0,0,0,1,0,0]
];
let downKeyText = [
[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,1,0,0,1,0,0,1,0,0,0,1,0,1,1,0],
[1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,1,1,0,0,0,1,0,0,0,1,0,1,0,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let leftKeyText = [
[1,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,0,1,0,0,0,1,1,0,1,0],
[1,0,0,0,1,0,1,0,1,0,0,1,1,1],
[1,0,0,0,1,1,1,0,1,1,0,0,1,0],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0],
[1,1,1,0,0,1,1,0,1,0,0,0,1,1]
];
let rightKeyText = [
[1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0],
[1,0,1,0,1,0,1,1,1,0,1,1,0,1,1,1],
[1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0],
[1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0],
[1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,1],
[0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0]
];
let jumpKeyText = [
[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,1,0,1,0,1,0,1,1,1,1,0,0,1,1,0],
[0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,1,0,0,0,1,1,0,1,0,1,0,1,0,1,1,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]
];
let chargeKeyText = [
[0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,1,1,0,0,0,1,1,0,0,1,0,1,1,1,0,0,1,0,0,0,0,1,0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,1,0,0,0,1,1,0,0,0,1,0,0,0,1,0,1,1,1],
[1,0,0,0,1,0,1,0,1,1,1,0,1,0,0,1,1,1,0,1,1,1,0,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
[0,1,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,1,0,0,1,1,0,0,1,0,1,0,0,1,0,0,0,1,0,0,1,1]
];
let chargeHoldKeyText = [
[1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,0,1,0,0,1,0,0,1,1,0,0,0,1,0,0,0,1,1,0,0,0,1,1,0,0,1,0,1,1,1,0,0,1,0],
[1,1,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,0,1,0,0,1,1,1,0,1,1,1],
[1,0,1,0,0,1,0,0,1,0,0,1,1,0,0,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1]
];
let confirmKeyText = [
[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,0,1,1,1,1,0],
[1,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,0,1,0,1,0,1],
[1,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1],
[0,1,1,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1]
];
let cancelKeyText = [
[0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,1,1,0,1,1,0,0,0,1,0,0,1,0,0,1],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1],
[1,0,0,0,1,1,1,0,1,0,1,0,1,0,0,1,1,1,0,1],
[0,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,0,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0]
];
let pauseKeyText = [
[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,0,1,0],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1],
[1,1,0,0,1,1,1,0,1,0,1,0,0,1,0,1,1,1],
[1,0,0,0,1,0,1,0,0,1,1,0,1,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let negativeAimXText = [
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[0,0,0,0,0,1,1,0,1,0,1,1,1,1,0,0,1,0,1],
[1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,0,0,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let positiveAimXText = [
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[0,1,0,0,0,1,1,0,1,0,1,1,1,1,0,0,1,0,1],
[1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,1,0,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let negativeAimYText = [
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[0,0,0,0,0,1,1,0,1,0,1,1,1,1,0,0,1,0,1],
[1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,0,0,0,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let positiveAimYText = [
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[0,1,0,0,0,1,1,0,1,0,1,1,1,1,0,0,1,0,1],
[1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[0,1,0,0,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let pausedText = [
[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,0,1,0,0,0,1,1],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1],
[1,1,0,0,1,1,1,0,1,0,1,0,0,1,0,1,1,1,0,1,0,1],
[1,0,0,0,1,0,1,0,0,1,1,0,1,1,0,1,0,0,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0]
];
let continueText = [
[1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,0,1,0,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,0],
[1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,1,0,0,1,0,1],
[1,1,0,0,1,1,1,0,0,1,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,1,0,0,0,0,1,1,0,0,1,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let mainMenuText = [
[1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
[1,1,0,1,1,0,0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,0,0,1,0,0,1,1,0,0,1,0,1],
[1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0]
];
let exitGameText = [
[1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,0,0,1,0,1,0,1,0,1,1,1,0,0,0,1,0,0,0,0,0,1,1,0,1,1,1,1,0,0,0,1,0],
[1,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,1,0,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1],
[1,1,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]
];
let exitToMainMenuText = [
[1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
[1,0,0,0,1,0,1,0,1,0,1,1,1,0,0,0,1,1,1,0,0,1,0,0,0,0,1,1,0,1,1,0,0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,0,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1],
[1,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1],
[1,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0],
[1,1,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,1,0,0,1,0,0,0,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,1,1,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0]
];
let exitToStageSelectText = [
[1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0],
[1,0,0,0,1,0,1,0,1,0,1,1,1,0,0,0,1,1,1,0,0,1,0,0,0,0,1,0,0,0,1,1,1,0,0,1,1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1,1,0,1,0,1],
[1,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,0,1,1,1,0,1,0,0,0,1,0,0,0,0,1],
[1,0,0,0,1,0,1,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,0,0,1,0,0,1,0,0,1,1,1,0,1,1,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
[1,1,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,1,0,0,1,0,0,0,0,1,1,0,0,0,1,1,0,1,0,1,0,0,0,1,0,0,1,1,0,1,1,0,0,0,1,1,0,1,0,0,1,1,0,0,1,0,0,1,1,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]
];
let yesText = [
[1,0,1,0,0,0,0,0,0,0,0],
[1,0,1,0,0,1,0,0,0,1,1],
[1,0,1,0,1,0,1,0,1,0,0],
[0,1,0,0,1,1,1,0,0,1,0],
[0,1,0,0,1,0,0,0,0,0,1],
[0,1,0,0,0,1,1,0,1,1,0]
];
let noText = [
[1,0,0,0,1,0,0,0,0,0],
[1,1,0,0,1,0,0,1,1,0],
[1,1,1,0,1,0,1,0,0,1],
[1,0,1,1,1,0,1,0,0,1],
[1,0,0,1,1,0,1,0,0,1],
[1,0,0,0,1,0,0,1,1,0]
];
let confirmPlayersText = [
[0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
[1,0,0,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,0,1,1,1,1,0,0,0,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1],
[1,0,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,0,1,0],
[1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,0,0,1,0,0,1,0,0,0,1,0,0,0,1],
[0,1,1,0,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0,0,1,1,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let resultsText = [
[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[1,0,1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0],
[1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,1,0,1,1],
[1,1,0,0,1,1,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0,1,0],
[1,0,1,0,1,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,0,1],
[1,0,1,0,0,1,1,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,1]
];
let WinnerTexts = [
[
	[0,1,0,0,0,0,0,1,0],
	[1,1,0,1,1,0,1,1,1],
	[0,1,0,1,0,0,0,1,0],
	[0,1,0,0,1,0,0,1,0],
	[0,1,0,1,1,0,0,1,1]
],
[
	[1,1,1,0,0,0,0,0,0,0,1],
	[0,0,1,0,1,1,0,0,0,1,1],
	[1,1,1,0,1,0,1,0,1,0,1],
	[1,0,0,0,1,0,1,0,1,0,1],
	[1,1,1,0,1,0,1,0,0,1,1]
],
[
	[1,1,1,0,0,0,0,0,0,1],
	[0,0,1,0,0,1,0,0,1,1],
	[1,1,1,0,1,0,0,1,0,1],
	[0,0,1,0,1,0,0,1,0,1],
	[1,1,1,0,1,0,0,0,1,1]
],
[
	[1,0,1,0,0,1,0,0,1,0,0],
	[1,0,1,0,1,1,1,0,1,1,0],
	[1,1,1,0,0,1,0,0,1,0,1],
	[0,0,1,0,0,1,0,0,1,0,1],
	[0,0,1,0,0,1,1,0,1,0,1]
]
];
let rematchText = [
[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
[1,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0],
[1,0,1,0,1,0,1,0,1,1,1,1,0,0,0,1,1,0,1,1,1,0,0,1,0,1,1,0],
[1,1,0,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,0,1,0,1],
[1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,0,1,0,0,1,0,0,1,0,1],
[1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,0,1,0,1]
];
let stageSelectSmallText = [
[0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,1,0],
[1,0,0,0,1,1,1,0,0,1,1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1,1],
[0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,0,1,1,1,0,1,0,0,0,1,0],
[0,0,1,0,0,1,0,0,1,1,1,0,1,1,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0],
[1,1,0,0,0,1,1,0,1,0,1,0,0,0,1,0,0,1,1,0,1,1,0,0,0,1,1,0,1,0,0,1,1,0,0,1,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

let GUIstate = {
	Enabled:0,
	Disabled:1,
	Hidden:2
};

let GUI = {
logo:{data:logo, xDiff:-430, yDiff:-288, textWidth:10, textHeight:9, textXoffset:1, textYoffset:1, textXgap:1, textYgap:1, textColor:"#FFFFFF", bgColor:"#00000000", drawStarted:false, secret:false},
main:{
	run(){MainMenu();},
	button:[
		{data:adventureText, menu:"adventure", xDiff:-205, yDiff:-20, width:410, height:75, textXoffset:8, textYoffset:8},
		{data:battleText, menu:"battle", xDiff:-150, yDiff:60, width:300, height:75, textXoffset:35, textYoffset:8},
		{data:optionsText, menu:"options", xDiff:-150, yDiff:140, width:300, height:75, textXoffset:13, textYoffset:8}
	]
},
adventure:{
	run(){Adventure();},
	title:{data:adventureText,cancel:true,xDiff:-205,yDiff:-20,width:410,height:75,textXoffset:8,textYoffset:8,targetXdiff:-450,targetYdiff:-155,targetWidth:900,targetHeight:225},
	button:[
		{data:startText, xDiff:-117, yDiff:-38, width:234, height:75, textXoffset:13, textYoffset:13}
	]
},
battle:{
	run(){Battle();},
	title:{data:battleText,cancel:true,xDiff:-150,yDiff:60,width:300,height:75,textXoffset:35,textYoffset:8,targetXdiff:-450,targetYdiff:-155,targetWidth:900,targetHeight:450},
	background:[
		{data:null, xDiff:-140, yDiff:-87, width:580, height:372, bgColor:"#00000000"}, //stageSelectBg
		{data:null, xDiff:-448, yDiff:-80, width:298, height:96, bgColor:"#333333"}, //gameTypeBg
		{data:null, xDiff:-448, yDiff:16, width:298, height:277, bgColor:"#444444"} //gameConfigBg
	],
	label:[
		{data:stageSelectText, xDiff:2, yDiff:-130, textWidth:6, textHeight:5},
		{data:gameTypeText, xDiff:-427, yDiff:-63, textWidth:3, textHeight:2},
		{data:winScoreText, xDiff:-427, yDiff:-16, textWidth:3, textHeight:2},
		{data:lifeCountText, xDiff:-427, yDiff:-16, textWidth:3, textHeight:2},
		{data:shotSpeedText, xDiff:-427, yDiff:32, textWidth:3, textHeight:2},
		{data:infiniteJumpText, xDiff:-427, yDiff:77, textWidth:3, textHeight:2},
		{data:knockBackText, xDiff:-427, yDiff:124, textWidth:3, textHeight:2},
		{data:instantChargeText, xDiff:-427, yDiff:167, textWidth:3, textHeight:2},
		{data:fixedCameraText, xDiff:-427, yDiff:212, textWidth:3, textHeight:2},
		{data:noPile1Text, xDiff:-427, yDiff:247, textWidth:3, textHeight:2},
		{data:noPile2Text, xDiff:-427, yDiff:267, textWidth:3, textHeight:2}
	],
	dropdown:[
		{data:null,activeItem:0,selectedItem:0,xDiff:-275,yDiff:-70,width:115,height:32,pTextAlign:"left",pFontSize:20,pTextXoffset:8,pTextYoffset:-9,
			item:[
				{data:null,pText:"Score-battle"}, //add gameType property?
				{data:null,pText:"Life-battle"}
			]
		}
	],
	adjustbox:[
		{data:Adjust, xDiff:-251, yDiff:-25, width:91, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4,
			number:[
				{data:Numbers[5], xDiff:51, textYoffset:4, textWidth:5, textHeight:4},
				{data:Numbers[0], xDiff:31, textYoffset:4, textWidth:5, textHeight:4},
				{data:Numbers[0], xDiff:11, textYoffset:4, textWidth:5, textHeight:4}
			]
		}, //winScore
		{data:Adjust, xDiff:-251, yDiff:-25, width:91, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4,
			number:[
				{data:Numbers[3], xDiff:51, textYoffset:4, textWidth:5, textHeight:4},
				{data:Numbers[0], xDiff:31, textYoffset:4, textWidth:5, textHeight:4},
				{data:Numbers[0], xDiff:11, textYoffset:4, textWidth:5, textHeight:4}
			]
		}, //lifeCount
		{data:Adjust, xDiff:-251, yDiff:25, width:91, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4,
			number:[
				{data:Numbers[5], xDiff:37, textYoffset:4, textWidth:5, textHeight:4}
			]
		} //shotSpeed
	],
	checkbox:[
		{data:Disable, xDiff:-197, yDiff:70, width:37, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4}, //infiniteJump
		{data:Disable, xDiff:-197, yDiff:115, width:37, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4}, //knockBack
		{data:Disable, xDiff:-197, yDiff:160, width:37, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4}, //instantCharge
		{data:Disable, xDiff:-197, yDiff:205, width:37, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4}, //fixedCamera
		{data:Disable, xDiff:-197, yDiff:250, width:37, height:32, textXoffset:4, textYoffset:4, textWidth:5, textHeight:4} //noPile
	],
	button:[
		{data:Minus, xDiff:-140, yDiff:-147, width:60, height:52, textXoffset:3, textYoffset:2},
		{data:Plus, xDiff:377, yDiff:-147, width:60, height:52, textXoffset:3, textYoffset:2}
	],
	stagebutton:[
	]
},
options:{
	run(){Options();},
	title:{data:optionsText,cancel:true,xDiff:-150,yDiff:140,width:300,height:75,textXoffset:13,textYoffset:8,targetXdiff:-450,targetYdiff:-155,targetWidth:900,targetHeight:450},
	background:[
		{data:null, xDiff:-430, yDiff:129, width:150, height:150, bgColor:"#777777", bgFadeColor:"#333333",
			background:[{data:null, width:4, height:4, bgColor:"#FF0000", bgFadeColor:"#770000"}] //StickAim test area dot
		} //StickAim test area
	],
	label:[
		{data:collisionQualityText, xDiff:-430, yDiff:-48, textWidth:5, textHeight:4},
		{data:soundVolumeText, xDiff:-430, yDiff:11, textWidth:6, textHeight:5},
		{data:guiScaleText, xDiff:-251, yDiff:78, textWidth:4, textHeight:3},
		{data:vsyncText, xDiff:-430, yDiff:78, textWidth:4, textHeight:3},
		{data:upKeyText, xDiff:152, yDiff:-130, textWidth:4, textHeight:3},
		{data:downKeyText, xDiff:102, yDiff:-86, textWidth:4, textHeight:3},
		{data:leftKeyText, xDiff:122, yDiff:-46, textWidth:4, textHeight:3},
		{data:rightKeyText, xDiff:112, yDiff:-4, textWidth:4, textHeight:3},
		{data:jumpKeyText, xDiff:107, yDiff:38, textWidth:4, textHeight:3},
		{data:chargeKeyText, xDiff:-28, yDiff:80, textWidth:4, textHeight:3},
		{data:chargeHoldKeyText, xDiff:2, yDiff:122, textWidth:4, textHeight:3},
		{data:confirmKeyText, xDiff:72, yDiff:164, textWidth:4, textHeight:3},
		{data:cancelKeyText, xDiff:92, yDiff:206, textWidth:4, textHeight:3},
		{data:pauseKeyText, xDiff:102, yDiff:248, textWidth:4, textHeight:3},
		{data:negativeAimXText, xDiff:-270, yDiff:137, textWidth:4, textHeight:3},
		{data:positiveAimXText, xDiff:-270, yDiff:175, textWidth:4, textHeight:3},
		{data:negativeAimYText, xDiff:-270, yDiff:213, textWidth:4, textHeight:3},
		{data:positiveAimYText, xDiff:-270, yDiff:251, textWidth:4, textHeight:3}
	],
	adjustbox:[
		{data:Adjust, xDiff:-103, yDiff:-62, width:161, height:57, textXoffset:4, textYoffset:4,
			number:[
				{data:Numbers[0], xDiff:90, textYoffset:4},
				{data:Numbers[0], xDiff:54, textYoffset:4},
				{data:Numbers[1], xDiff:17, textYoffset:4}
			]
		}, //collisionQuality
		{data:Adjust, xDiff:-103, yDiff:0, width:161, height:57, textXoffset:4, textYoffset:4,
			number:[
				{data:Numbers[0], xDiff:90, textYoffset:4},
				{data:Numbers[0], xDiff:54, textYoffset:4},
				{data:Numbers[1], xDiff:17, textYoffset:4}
			]
		} //soundVolume
	],
	checkbox:[
		{data:Enable, xDiff:-103, yDiff:71, width:42, height:37, textXoffset:4, textYoffset:4, textWidth:6, textHeight:5}, //guiScale
		{data:Enable, xDiff:-317, yDiff:71, width:42, height:37, textXoffset:4, textYoffset:4, textWidth:6, textHeight:5} //v-sync
	],
	inputfield:[ //keyBinding inputfield
		{data:null, inputType:Input.up, xDiff:200, yDiff:-139, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.down, xDiff:200, yDiff:-97, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.left, xDiff:200, yDiff:-55, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.right, xDiff:200, yDiff:-13, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.jump, xDiff:200, yDiff:29, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.charge, xDiff:200, yDiff:71, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.chargehold, xDiff:200, yDiff:113, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.confirm, xDiff:200, yDiff:155, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.cancel, xDiff:200, yDiff:197, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.pause, xDiff:200, yDiff:239, width:199, height:40, pTextAlign:"right", pFontSize:30, pTextXoffset:-6, pTextYoffset:-10,
			button:[{data:Plus, xDiff:201, width:39, height:40, textYoffset:3, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.aimXneg, xDiff:-167, yDiff:129, width:116, height:36, pTextAlign:"right", pFontSize:24, pTextXoffset:-6, pTextYoffset:-12,
			button:[{data:Plus, xDiff:118, width:39, height:36, textYoffset:1, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.aimXpos, xDiff:-167, yDiff:167, width:116, height:36, pTextAlign:"right", pFontSize:24, pTextXoffset:-6, pTextYoffset:-12,
			button:[{data:Plus, xDiff:118, width:39, height:36, textYoffset:1, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.aimYneg, xDiff:-167, yDiff:205, width:116, height:36, pTextAlign:"right", pFontSize:24, pTextXoffset:-6, pTextYoffset:-12,
			button:[{data:Plus, xDiff:118, width:39, height:36, textYoffset:1, textWidth:7, textHeight:6}]},
		{data:null, inputType:Input.aimYpos, xDiff:-167, yDiff:243, width:116, height:36, pTextAlign:"right", pFontSize:24, pTextXoffset:-6, pTextYoffset:-12,
			button:[{data:Plus, xDiff:118, width:39, height:36, textYoffset:1, textWidth:7, textHeight:6}]}
	],
	button:[
		{data:Numbers[1],player:1,xDiff:-150,yDiff:-155,width:52,height:41,textXoffset:9,textYoffset:6,textWidth:6,textHeight:5,borderColor:PlayerColors[1].color}, //playerButton1
		{data:Numbers[2],player:2,xDiff:-98,yDiff:-155,width:52,height:41,textXoffset:16,textYoffset:6,textWidth:6,textHeight:5,borderColor:PlayerColors[2].color}, //playerButton2
		{data:Numbers[3],player:3,xDiff:-46,yDiff:-155,width:52,height:41,textXoffset:16,textYoffset:6,textWidth:6,textHeight:5,borderColor:PlayerColors[3].color}, //playerButton3
		{data:Numbers[4],player:4,xDiff:6,yDiff:-155,width:52,height:41,textXoffset:16,textYoffset:6,textWidth:6,textHeight:5,borderColor:PlayerColors[4].color} //playerButton4
	],
	dropdown:[
		{data:null,activeItem:0,selectedItem:0,xDiff:-150,yDiff:-117,width:208,height:37,pTextAlign:"left",pFontSize:20,pTextXoffset:10,pTextYoffset:-12,
			item:[
			]
		}
	]
},
pause:{
	run(){Pause();},
	label:[
		{data:pausedText, xDiff:-241, yDiff:-80, textWidth:20, textHeight:18, textXgap:2, textYgap:2, textColor:"#0000FF"}
	],
	button:[
		{data:continueText, xDiff:-150, yDiff:60, width:300, height:75, textXoffset:24, textYoffset:8},
		{data:optionsText, menu:"options", xDiff:-150, yDiff:140, width:300, height:75, textXoffset:13, textYoffset:8},
		{data:exitGameText, menu:"exitGame", xDiff:-150, yDiff:230, width:300, height:60, textXoffset:15, textYoffset:10, textWidth:7, textHeight:6}
	]
},
exitGame:{
	run(){ExitGame();},
	title:{data:exitGameText,cancel:true,xDiff:-150,yDiff:230,width:300,height:60,textXoffset:15,textYoffset:10,textWidth:7,textHeight:6,targetXdiff:-350,targetYdiff:-55,targetWidth:700,targetHeight:250},
	label:[
		{data:exitToMainMenuText, xDiff:-220, yDiff:25, textWidth:6, textHeight:5},
		{data:exitToStageSelectText, xDiff:-244, yDiff:25, textWidth:6, textHeight:5}
	],
	button:[
		{data:noText, cancel:true, xDiff:100, yDiff:90, width:200, height:75, textXoffset:46, textYoffset:8},
		{data:yesText, xDiff:-300, yDiff:90, width:200, height:75, textXoffset:40, textYoffset:8}
	]
},
results:{
	run(){Results();},
	title:{data:resultsText,xDiff:-450,yDiff:-155,width:278,height:75,textXoffset:13,textYoffset:8,targetWidth:900,targetHeight:400, isOption:false},
	background:[
		{data:Numbers[1],xDiff:-380,yDiff:-65,width:160,height:230,border:3,textXoffset:63,textWidth:6,textHeight:5,textColor:playerTextColor,borderColor:PlayerColors[1].fadeColor,bgColor:PlayerColors[1].color,
			label:[{data:null,textYoffset:10,textBorder:2,textColor:optionTextHighlightColor}]
		},
		{data:Numbers[2],xDiff:-180,yDiff:-65,width:160,height:230,border:3,textXoffset:70,textWidth:6,textHeight:5,textColor:playerTextColor,borderColor:PlayerColors[2].fadeColor,bgColor:PlayerColors[2].color,
			label:[{data:null,textYoffset:10,textBorder:2,textColor:optionTextHighlightColor}]
		},
		{data:Numbers[3],xDiff:20,yDiff:-65,width:160,height:230,border:3,textXoffset:70,textWidth:6,textHeight:5,textColor:playerTextColor,borderColor:PlayerColors[3].fadeColor,bgColor:PlayerColors[3].color,
			label:[{data:null,textYoffset:10,textBorder:2,textColor:optionTextHighlightColor}]
		},
		{data:Numbers[4],xDiff:220,yDiff:-65,width:160,height:230,border:3,textXoffset:70,textWidth:6,textHeight:5,textColor:playerTextColor,borderColor:PlayerColors[4].fadeColor,bgColor:PlayerColors[4].color,
			label:[{data:null,textYoffset:10,textBorder:2,textColor:optionTextHighlightColor}]
		}
	],
	button:[
		{data:rematchText, xDiff:-416, yDiff:180, width:211, height:51, textXoffset:8,textYoffset:8,textWidth:6,textHeight:5},
		{data:stageSelectSmallText, menu:"battle", xDiff:-165, yDiff:180, width:295, height:51, textXoffset:8,textYoffset:8,textWidth:6,textHeight:5},
		{data:mainMenuText, menu:"main", xDiff:170, yDiff:180, width:246, height:51, textXoffset:8,textYoffset:8,textWidth:6,textHeight:5}
	]
},
playerConfirm:{
	label:[
		{data:confirmPlayersText, xDiff:0, yDiff:-130, textWidth:6, textHeight:5},
		{data:null, xDiff:0, yDiff:-12, pTextWidth:860, pTextAlign:"center", pFontSize:"bold 30", pTextColor:menuTextColor},
		{data:null, xDiff:0, yDiff:20, pTextAlign:"center", pFontSize:"bold 20", pTextColor:menuTextColor, pText:"(or doubleclick)"}
	],
	background:[
		{data:Numbers[1],xDiff:-380,yDiff:40,width:160,height:80,textXoffset:63,textYoffset:5,textWidth:6,textHeight:5,textColor:playerTextColor,textFadeColor:playerTextColor,textHighlightColor:optionTextHighlightColor,bgColor:PlayerColors[1].color,bgFadeColor:PlayerColors[1].fadeColor,bgHighlightColor:PlayerColors[1].color,
			background:[{data:null,xDiff:3,yDiff:40,width:154,height:37,pTextAlign:"center",pFontSize:"bold 20",pTextYoffset:-12,pTextColor:playerTextColor,bgColor:PlayerColors[1].bgColor,bgFadeColor:PlayerColors[1].bgFadeColor,bgHighlightColor:optionTextHighlightColor}]
		},
		{data:Numbers[2],xDiff:-180,yDiff:40,width:160,height:80,textXoffset:70,textYoffset:5,textWidth:6,textHeight:5,textColor:playerTextColor,textFadeColor:playerTextColor,textHighlightColor:optionTextHighlightColor,bgColor:PlayerColors[2].color,bgFadeColor:PlayerColors[2].fadeColor,bgHighlightColor:PlayerColors[2].color,
			background:[{data:null,xDiff:3,yDiff:40,width:154,height:37,pTextAlign:"center",pFontSize:"bold 20",pTextYoffset:-12,pTextColor:playerTextColor,bgColor:PlayerColors[2].bgColor,bgFadeColor:PlayerColors[2].bgFadeColor,bgHighlightColor:optionTextHighlightColor}]
		},
		{data:Numbers[3],xDiff:20,yDiff:40,width:160,height:80,textXoffset:70,textYoffset:5,textWidth:6,textHeight:5,textColor:playerTextColor,textFadeColor:playerTextColor,textHighlightColor:optionTextHighlightColor,bgColor:PlayerColors[3].color,bgFadeColor:PlayerColors[3].fadeColor,bgHighlightColor:PlayerColors[3].color,
			background:[{data:null,xDiff:3,yDiff:40,width:154,height:37,pTextAlign:"center",pFontSize:"bold 20",pTextYoffset:-12,pTextColor:playerTextColor,bgColor:PlayerColors[3].bgColor,bgFadeColor:PlayerColors[3].bgFadeColor,bgHighlightColor:optionTextHighlightColor}]
		},
		{data:Numbers[4],xDiff:220,yDiff:40,width:160,height:80,textXoffset:70,textYoffset:5,textWidth:6,textHeight:5,textColor:playerTextColor,textFadeColor:playerTextColor,textHighlightColor:optionTextHighlightColor,bgColor:PlayerColors[4].color,bgFadeColor:PlayerColors[4].fadeColor,bgHighlightColor:PlayerColors[4].color,
			background:[{data:null,xDiff:3,yDiff:40,width:154,height:37,pTextAlign:"center",pFontSize:"bold 20",pTextYoffset:-12,pTextColor:playerTextColor,bgColor:PlayerColors[4].bgColor,bgFadeColor:PlayerColors[4].bgFadeColor,bgHighlightColor:optionTextHighlightColor}]
		}
	]
}
};
AddDefaultProperties(GUI.logo,"logo",GUI);
for(let menu in GUI){ //assigning default values to properties manually instead of using an object prototype with default values (Should I?)
	if(GUI.hasOwnProperty(menu))
		CheckElementProperties(GUI[menu],menu,GUI,GUI[menu]);
}
function CheckElementProperties(element,elementType,parent,menu){
	for(let obj in element){
		if(element.hasOwnProperty(obj)){
			if(obj === "parent")
				break;
			if(element[obj] !== null){
				if(element[obj].hasOwnProperty("data")){
					let type = (isNaN(obj)) ? obj : elementType; //isNaN(obj) means that element is not inside an array so "obj" is the elementType (title for example)
					AddDefaultProperties(element[obj],type,parent,menu);
				}
				if(!isNaN(obj) && !isNaN(elementType))
					break;
				
				CheckElementProperties(element[obj],obj,element,menu);
			}
		}
	}
}
function AddDefaultProperties(element, elementType, parent, menu=null){ //element.property ??= default
	element.parent = parent;
	element.type = elementType;
	
	if(element.type==="title" ||
	element.type==="button" ||
	element.type==="checkbox" ||
	element.type==="adjustbox" ||
	element.type==="inputfield" ||
	element.type==="dropdown" ||
	element.type==="stagebutton"){ //dropdown item?
		if(!element.hasOwnProperty("isOption") || element.isOption){
			element.isOption = true;
			if(!menu.hasOwnProperty("options"))
				menu.options = [];
			menu.options.push(element);
		}
	} else
		element.isOption = false;
	
	if(!element.hasOwnProperty("xDiff")) element.xDiff = 0;
	if(!element.hasOwnProperty("yDiff")) element.yDiff = 0;
	element.orgXdiff = element.xDiff;
	element.orgYdiff = element.yDiff;
	if(!element.hasOwnProperty("width")) element.width = 0;
	if(!element.hasOwnProperty("height")) element.height = 0;
	element.orgWidth = element.width;
	element.orgHeight = element.height;
	if(!element.hasOwnProperty("padding")) element.padding = 0;
	if(!element.hasOwnProperty("border")){
		if(element.type === "background")
			element.border = 0;
		else
			element.border = 2;
	}
	if(!element.hasOwnProperty("textBorder")) element.textBorder = 0;
	if(!element.hasOwnProperty("textBorderColor")) element.textBorderColor = "#000000";
	if(!element.hasOwnProperty("textXoffset")) element.textXoffset = 0;
	if(!element.hasOwnProperty("textYoffset")) element.textYoffset = 0;
	if(!element.hasOwnProperty("textWidth")) element.textWidth = 10;
	if(!element.hasOwnProperty("textHeight")) element.textHeight = 9;
	if(!element.hasOwnProperty("textXgap")) element.textXgap = 1;
	if(!element.hasOwnProperty("textYgap")) element.textYgap = 1;
	if(!element.hasOwnProperty("targetXdiff")) element.targetXdiff = element.xDiff;
	if(!element.hasOwnProperty("targetYdiff")) element.targetYdiff = element.yDiff;
	if(!element.hasOwnProperty("targetWidth")) element.targetWidth = element.width;
	if(!element.hasOwnProperty("targetHeight")) element.targetHeight = element.height;
	element.orgTargetHeight = element.targetHeight; //used for playerConfirm
	element.orgTargetWidth = element.targetWidth; //not used for anything yet...
	if(!element.hasOwnProperty("borderColor")){
		if(element.type === "title")
			element.borderColor = menuBorderColor;
		else if(element.type === "item")
			element.borderColor = optionBgColor;
		else
			element.borderColor = optionBorderColor;
	}
	if(!element.hasOwnProperty("borderHighlightColor")) element.borderHighlightColor = optionBorderHighlightColor; //shorter names?
	if(!element.hasOwnProperty("borderFadeColor")) element.borderFadeColor = optionFadeColor;
	if(!element.hasOwnProperty("bgColor")){
		if(element.type === "title")
			element.bgColor = menuBgColor;
		else
			element.bgColor = optionBgColor;
	}
	if(!element.hasOwnProperty("bgHighlightColor")) element.bgHighlightColor = optionBgHighlightColor;
	if(!element.hasOwnProperty("bgFadeColor")) element.bgFadeColor = optionBgColor;
	if(!element.hasOwnProperty("fgColor")) element.fgColor = menuBorderColor;
	if(!element.hasOwnProperty("textColor")){
		if(element.type === "title")
			element.textColor = menuTitleColor;
		else if(element.isOption)
			element.textColor = optionTextColor;
		else
			element.textColor = menuTextColor;
	}
	if(!element.hasOwnProperty("textHighlightColor")) element.textHighlightColor = optionTextHighlightColor;
	if(!element.hasOwnProperty("textFadeColor")){
		if(element.isOption)
			element.textFadeColor = optionFadeColor;
		else
			element.textFadeColor = menuTextFadeColor;
	}
	if(!element.hasOwnProperty("guiState")) element.guiState = GUIstate.Enabled;
	if(!element.hasOwnProperty("selected")) element.selected = false;
	if(!element.hasOwnProperty("pTextAlign")) element.pTextAlign = "center";
	if(!element.hasOwnProperty("pFontSize")) element.pFontSize = 30;
	element.orgPfontSize = element.pFontSize;
	if(!element.hasOwnProperty("pTextXoffset")) element.pTextXoffset = 0;
	if(!element.hasOwnProperty("pTextYoffset")) element.pTextYoffset = 0;
	if(!element.hasOwnProperty("pTextWidth")) element.pTextWidth = element.width;
	if(!element.hasOwnProperty("pTextColor")) element.pTextColor = plainTextColor;
	if(!element.hasOwnProperty("pText")) element.pText = "";
}

function AddStageButton(stageIndex,stageWidth,stageHeight){
	GUI.battle.stagebutton.push({data:null, stage:stageIndex});
	AddDefaultProperties(GUI.battle.stagebutton[GUI.battle.stagebutton.length-1],"stagebutton",GUI.battle.background[0],GUI.battle);
}
function UpdateInputMethodMenu(){
	let inputDropdown = GUI.options.dropdown[0];
	inputDropdown.item = [];
	inputDropdown.targetWidth = inputDropdown.orgWidth;
	inputDropdown.borderColor = PlayerColors[activePlayer].color;
	inputDropdown.bgHighlightColor = PlayerColors[activePlayer].fadeColor;
	
	for(let method = 0; method < InputMethods.length; method++){
		inputDropdown.item.push({data:null,pText:InputMethods[method].id});
		AddDefaultProperties(inputDropdown.item[method],"item",inputDropdown,GUI.options);
		inputDropdown.item[method].bgHighlightColor = PlayerColors[activePlayer].fadeColor;
		
		if(InputMethods[method].player>0)
			inputDropdown.item[method].borderColor = PlayerColors[InputMethods[method].player].color;
		
		guiRender.font=inputDropdown.pFontSize+"px Arial";
		inputDropdown.targetWidth = Math.max(inputDropdown.targetWidth, Math.floor(guiRender.measureText(InputMethods[method].id).width));
	}
	if(Players[activePlayer].inputMethod===-1){ //activePlayer has no inputMethod
		inputDropdown.item.push({data:null,pText:""});
		AddDefaultProperties(inputDropdown.item[inputDropdown.item.length-1],"item",inputDropdown,GUI.options);
		inputDropdown.item[inputDropdown.item.length-1].bgHighlightColor = PlayerColors[activePlayer].fadeColor;
		
		inputDropdown.activeItem = inputDropdown.item.length-1;
	} else
		inputDropdown.activeItem = Players[activePlayer].inputMethod;
	
	inputDropdown.selectedItem = inputDropdown.activeItem;
}
function CloseAllMenus(){
	activeMenu = null;
	activeSubmenu = null;
}
function CurrentMenu(){
	return (activeSubmenu!==null) ? activeSubmenu : activeMenu; //return activeSubmenu ?? activeMenu;
}
function GetClosestOption(direction,option){
	let menuGUI = CurrentMenu();
	let guiElement = option;
	let guiParent = guiElement.parent;

	let siblingFound = false;
	let minDistance = Infinity;
	let maxOverlap = 0; //decreasing this initial value makes menu navigation less strict
	let overlapThreshold = 0.5; //percentage of length overlap required if a closer gui-element is found

	let guiTop = guiElement.yDiff+(guiParent.yDiff || 0); //?? 0
	let guiHeight = (guiElement.type==="title") ? guiElement.orgHeight : guiElement.height;
	let guiBottom = guiTop+guiHeight;
	let guiLeft = guiElement.xDiff+(guiParent.xDiff || 0); //?? 0
	let guiWidth = (guiElement.type==="title") ? guiElement.orgWidth : guiElement.width;
	let guiRight = guiLeft+guiWidth;
	
	for(let e = 0; e < menuGUI.options.length; e++){
		let newElement = menuGUI.options[e];

		if(guiElement===newElement || newElement.guiState !== GUIstate.Enabled)
			continue;

		let newParent = newElement.parent;

		let newTop = newElement.yDiff+(newParent.yDiff || 0); //?? 0
		let newHeight = (newElement.type==="title") ? newElement.orgHeight : newElement.height;
		let newBottom = newTop+newHeight;
		let newLeft = newElement.xDiff+(newParent.xDiff || 0); //?? 0
		let newWidth = (newElement.type==="title") ? newElement.orgWidth : newElement.width;
		let newRight = newLeft+newWidth;

		let overlap = 0;
		if(direction===Input.up || direction===Input.down){
			overlap = Math.min(guiRight,newRight)-Math.max(guiLeft,newLeft);
			overlap /= Math.min(guiWidth,newWidth);
		} else if(direction===Input.left || direction===Input.right){
			overlap = Math.min(guiBottom,newBottom)-Math.max(guiTop,newTop);
			overlap /= Math.min(guiHeight,newHeight);
		}
		
		let distance = 0;
		if(direction===Input.up)
			distance = guiTop-newBottom;
		else if(direction===Input.down)
			distance = newTop-guiBottom;
		else if(direction===Input.left)
			distance = guiLeft-newRight;
		else if(direction===Input.right)
			distance = newLeft-guiRight;
		
		if(distance < -5)
			continue;
		
		if(guiParent!==menuGUI && guiParent===newParent && !siblingFound){
			if(overlap >= overlapThreshold){
				siblingFound = true; //sibling objects have higher priority
				minDistance = Infinity; //override existing minDistance
			}
		}
		
		if(guiParent===newParent || !siblingFound)
		if((distance<minDistance && overlap >= overlapThreshold) || (overlap > maxOverlap && maxOverlap < overlapThreshold)){
			option = newElement;
			if(overlap >= overlapThreshold)
				minDistance = Math.min(distance,minDistance);
			
			maxOverlap = Math.max(overlap,maxOverlap);
		}
	}
	return option;
}
function NavigateGUI(direction){
	let optionChanged = false;
	if(activeOption===null){
		let previousOption = selectedOption;
		
		if(activeSubmenu===GUI.options && direction===Input.up && previousOption===GUI.options.dropdown[0])
			selectedOption = GUI.options.button[activePlayer-1]; //put selection to active playerButton
		else
			selectedOption = GetClosestOption(direction,selectedOption);
		
		let stageSelect = (activeSubmenu===GUI.battle && Stages.length>0 && selectedOption.parent === GUI.battle.background[0]);
		
		if(previousOption !== selectedOption)
			optionChanged = true;
		else if(stageSelect && direction===Input.down){ //stage selection didn't change (this can be removed completely if maxOverlap value is decreased)
			if(stageRow === GetLastStageRow()-1){ //second last row
				selectedOption = GUI.battle.stagebutton[Stages.length-1]; //select last stage
				optionChanged = true;
			}
		}
		if(optionChanged && stageSelect){
			let selectedStage = selectedOption.stage+1; //index+1
			while(true){
				if(stageRow*stageColumnCount < selectedStage-stageColumnCount*stageColumnCount)
					stageRow++;
				else if(stageRow*stageColumnCount >= selectedStage)
					stageRow--;
				else
					break;
			}
		}
	} else {
		if(activeOption.hasOwnProperty("item")){ //dropdown
			let prevSelectedItem = activeOption.selectedItem;
			
			let firstIsActive = (activeOption.activeItem===0);
			let lastIsActive = (activeOption.activeItem===activeOption.item.length-1);
			//active item is at the top of the list: (this could be cleaned up (or dropdown items could be changed to regular gui-elements))
			if(direction===Input.up){
				if(activeOption.selectedItem-1 === activeOption.activeItem)
					activeOption.selectedItem -= 1+!firstIsActive;
				else if(activeOption.selectedItem-1 < 0)
					activeOption.selectedItem = activeOption.activeItem;
				else if(activeOption.selectedItem !== activeOption.activeItem)
					activeOption.selectedItem--;
			} else if(direction===Input.down){
				if(activeOption.selectedItem+1 === activeOption.activeItem)
					activeOption.selectedItem += 2*!lastIsActive;
				else if(activeOption.selectedItem === activeOption.activeItem)
					activeOption.selectedItem = 1*(firstIsActive && !lastIsActive);
				else if(activeOption.selectedItem < activeOption.item.length-1)
					activeOption.selectedItem++;
			}
			
			if(prevSelectedItem!==activeOption.selectedItem)
				optionChanged = true;
		} else if(direction===Input.left || direction===Input.right)
			SetAdjustBox(CurrentMenu(),activeOption,(direction===Input.left) ? -1 : 1);
	}
	
	if(optionChanged)
		PlaySound(Sounds.select);
}
let guiX=0,guiY=0;
function MouseOver(element){
	if(element.guiState !== GUIstate.Enabled)
		return false;
	
	guiY = scaledHeightHalf+element.yDiff+(element.parent.yDiff || 0); //?? 0
	guiX = scaledWidthHalf+element.xDiff+(element.parent.xDiff || 0); //?? 0
	if(mouseY>=guiY && mouseY<guiY+element.height && mouseX>=guiX && mouseX<guiX+element.width)
		return true;
	
	return false;
}
function CheckMouse(clicked){
	if(optionSelected || menuAnimating)
		return false;

	let menuGUI = CurrentMenu();
	
	for(let e = 0; e < menuGUI.options.length; e++){
		let guiElement = menuGUI.options[e];
		
		if(guiElement.type === "title" && !mouseDrag && activeOption===null){
			guiY = scaledHeightHalf+guiElement.yDiff;
			guiX = scaledWidthHalf+guiElement.xDiff;
			if(mouseY>=guiY && mouseY<guiY+guiElement.orgHeight)
			if(mouseX>=guiX && mouseX<guiX+guiElement.orgWidth){
				selectedOption = guiElement;
				return true;
			}
		}
		
		if(playerConfirm)
			continue;

		if(guiElement.type === "dropdown" && !mouseDrag){
			if(activeOption===guiElement){
				for(let item = 0; item < guiElement.item.length; item++){
					if(MouseOver(guiElement.item[item])){
						guiElement.selectedItem = item;
						return true;
					}
				}
				if(clicked){
					selectedOption = cancel;
					return true;
				}
			} else if(activeOption===null){
				if(MouseOver(guiElement)){
					selectedOption = guiElement;
					return true;
				}
			}
		}
		if(guiElement.type === "adjustbox" && !mouseDrag && (activeOption===null || activeOption===guiElement)){
			if(clicked){
				if(MouseOver(guiElement)){
					if(mouseX>guiX && mouseX<guiX+guiElement.width*0.25){
						SetAdjustBox(CurrentMenu(),guiElement,-1);
						return false;
					}
					if(mouseX>guiX+guiElement.width*0.75 && mouseX<guiX+guiElement.width){
						SetAdjustBox(CurrentMenu(),guiElement,1);
						return false;
					}
				} else if(activeOption===guiElement){
					selectedOption = cancel;
					return true;
				}
			} else if(activeOption===null){
				if(MouseOver(guiElement)){
					selectedOption=guiElement;
					return true;
				}
			}
		}

		if(activeOption!==null)
			continue;

		if(activeSubmenu===GUI.options){
			deadzoneTargetWidth = deadzoneSliderSmall;
			
			if(guiElement.type === "inputfield"){
				if(mouseDrag){
					if(selectedOption===guiElement){
						deadzoneTargetWidth = deadzoneSliderLarge;
						let KeyBind = KeyBindings[activePlayer][guiElement.inputType];
						KeyBind.deadzone = Clamp((mouseX-scaledWidthHalf-guiElement.xDiff)/guiElement.width, 0, 1);
					}
				} else {
					if(MouseOver(guiElement)){
						selectedOption=guiElement;
						if(mouseX>guiX+((guiElement.width-deadzoneSliderLarge)*KeyBindings[activePlayer][guiElement.inputType].deadzone))
						if(mouseX<guiX+((guiElement.width-deadzoneSliderLarge)*KeyBindings[activePlayer][guiElement.inputType].deadzone)+deadzoneSliderLarge){
							deadzoneTargetWidth = deadzoneSliderLarge;
							if(clicked)
								mouseDrag=true;
							return false;
						}
						return true;
					}
				}
			}
		} else if(activeSubmenu===GUI.battle){
			if(guiElement.type === "stagebutton"){
				if(!MouseOver(GUI.battle.background[0]))
					break;

				if(MouseOver(guiElement)){
					selectedOption=guiElement;
					return true;
				}
			}
		}

		if(mouseDrag)
			continue;
		
		if(guiElement.type === "button" || guiElement.type === "checkbox"){
			if(MouseOver(guiElement)){
				selectedOption=guiElement;
				return true;
			}
		}
	}
	return false;
}
function SetAdjustBox(menu,option,change){
	let oldAdjust = 0, newAdjust = 0;
	if(menu===GUI.battle){
		if(option===GUI.battle.adjustbox[0]){
			oldAdjust = winScore;
			winScore = Clamp(winScore+change, 1, 100);
			newAdjust = winScore;
		} else if(option===GUI.battle.adjustbox[1]){
			oldAdjust = lifeCount;
			lifeCount = Clamp(lifeCount+change, 1, 100);
			newAdjust = lifeCount;
		} else if(option===GUI.battle.adjustbox[2]){
			oldAdjust = shotSpeed;
			shotSpeed = Clamp(shotSpeed+change, 1, 5);
			newAdjust = shotSpeed;
		}
	} else if(menu===GUI.options){
		if(option===GUI.options.adjustbox[0]){
			oldAdjust = updateInterval;
			updateInterval = Clamp(updateInterval-change, 1, 5);
			UpdateMultiplier(updateInterval);
			newAdjust = updateInterval;
		} else if(option===GUI.options.adjustbox[1]){
			oldAdjust = soundVolume;
			soundVolume = Clamp(soundVolume+change*0.01, 0, 1);
			newAdjust = soundVolume;
		}
	}
	if(oldAdjust!==newAdjust)
		PlaySound(Sounds.select);
}
function SetAdjustNumber(adjustBox, adjustNumber){
	adjustNumber = Clamp(adjustNumber, 0, Math.pow(10,adjustBox.number.length)-1);
	
	if(Math.floor(adjustNumber/100)>=1){
		adjustBox.number[2].data = Numbers[1];
		adjustBox.number[1].data = Numbers[0];
		adjustBox.number[0].data = Numbers[0];
	} else {
		if(adjustBox.number.length > 2)
			adjustBox.number[2].data = Disable;
		
		if(Math.floor(adjustNumber/10)>=1){
			adjustBox.number[1].data = Numbers[Math.floor(adjustNumber/10)];
			adjustBox.number[0].data = Numbers[adjustNumber-Math.floor(adjustNumber/10)*10];
		} else {
			if(adjustBox.number.length > 1)
				adjustBox.number[1].data = Disable;
			
			adjustBox.number[0].data = Numbers[adjustNumber];
		}
	}
}
function MainMenu(){
	if(optionSelected && activeSubmenu===null){
		optionSelected=false;
		if(selectedOption.hasOwnProperty("menu")){
			lastOption = selectedOption;
			GUI[selectedOption.menu].run();
		}
	}

	LogoDraw();
	
	RenderElements(GUI.main);
	
	if(activeSubmenu !== null)
		activeSubmenu.run();
}
function Adventure(){
	if(activeSubmenu!==GUI.adventure){
		gameMode=GameMode.adventure;
		activeSubmenu = GUI.adventure;
		selectedOption = GUI.adventure.button[0];
		playerConfirm = true;
		for(let pl = 1; pl < Players.length; pl++)
			Players[pl].joined = false;
		firstJoined = 0;
		GUI.adventure.title.targetHeight = 300; //playerConfirm targetHeight
		GUI.adventure.title.yDiff=GUI.adventure.title.orgYdiff;
		GUI.adventure.title.xDiff=GUI.adventure.title.orgXdiff;
		ShowMenu(GUI.adventure.title);
	}
	if(optionSelected){
		optionSelected=false;
		if(selectedOption===cancel || selectedOption.cancel){
			playerConfirm = false;
			HideMenu(GUI.adventure.title);
		} else if(selectedOption===GUI.adventure.button[0] && !playerConfirm){
			CloseAllMenus();
			InitializeGame(0);
		}
	}

	RenderMenu(GUI.adventure.title);

	if(!menuAnimating){
		if(playerConfirm)
			PlayerConfirmWindow();
		else
			RenderElements(GUI.adventure);
	}
}
function Battle(){
	if(activeSubmenu!==GUI.battle){
		gameMode=GameMode.battle;
		activeSubmenu = GUI.battle;
		selectedOption = GUI.battle.dropdown[0];
		playerConfirm = true;
		for(let pl = 1; pl < Players.length; pl++)
			Players[pl].joined = false;
		firstJoined = 0;
		GUI.battle.title.targetHeight = 300; //playerConfirm targetHeight
		GUI.battle.title.yDiff=GUI.battle.title.orgYdiff;
		GUI.battle.title.xDiff=GUI.battle.title.orgXdiff;
		ShowMenu(GUI.battle.title);
	}
	if(optionSelected){
		optionSelected=false;
		if(activeOption===null){
			if(selectedOption===cancel || selectedOption.cancel){
				playerConfirm = false;
				HideMenu(GUI.battle.title);
			} else if(!playerConfirm){
				if(selectedOption===GUI.battle.dropdown[0]){
					activeOption = selectedOption;
					GUI.battle.dropdown[0].selectedItem = GUI.battle.dropdown[0].activeItem;
					ShowMenu(GUI.battle.dropdown[0]);
				} else if(selectedOption.type==="adjustbox")
					activeOption = selectedOption;
				else if(selectedOption===GUI.battle.checkbox[0])
					infiniteJump=!infiniteJump;
				else if(selectedOption===GUI.battle.checkbox[1])
					noKnockback=!noKnockback;
				else if(selectedOption===GUI.battle.checkbox[2])
					instantCharge=!instantCharge;
				else if(selectedOption===GUI.battle.checkbox[3])
					fixedCamera=!fixedCamera;
				else if(selectedOption===GUI.battle.checkbox[4])
					noPile=!noPile;
				else if(selectedOption===GUI.battle.button[0] || selectedOption===GUI.battle.button[1]){
					let columnDir = (selectedOption===GUI.battle.button[0]) ? -1 : 1;
					let newColumnCount = Clamp(stageColumnCount+columnDir, 1, Math.max(Stages.length,3));
					if(stageColumnCount !== newColumnCount){
						stageColumnCount = newColumnCount;
						stageRow += Math.floor(stageRow/stageColumnCount)*(-columnDir);
						stageRow = Clamp(stageRow, 0, GetLastStageRow());
						stageRowStep = stageRow; //instant stageRow position set
					}
				} else {
					CloseAllMenus();
					InitializeGame(selectedOption.stage);
				}
			}
		} else if(activeOption===GUI.battle.dropdown[0]){
			if(selectedOption!==cancel)
				gameType = GUI.battle.dropdown[0].selectedItem;
			HideMenu(GUI.battle.dropdown[0]);
		} else {
			selectedOption = activeOption;
			activeOption = null;
		}
	}

	RenderMenu(GUI.battle.title);

	if(!menuAnimating || activeOption===GUI.battle.dropdown[0]){
		if(playerConfirm)
			PlayerConfirmWindow();
		else {
			GUI.battle.dropdown[0].activeItem = gameType;
			GUI.battle.adjustbox[0].guiState = (gameType===GameType.score) ? GUIstate.Enabled : GUIstate.Hidden;
			GUI.battle.adjustbox[1].guiState = (gameType===GameType.life) ? GUIstate.Enabled : GUIstate.Hidden;
			GUI.battle.label[2].guiState = (gameType===GameType.score) ? GUIstate.Enabled : GUIstate.Hidden;
			GUI.battle.label[3].guiState = (gameType===GameType.life) ? GUIstate.Enabled : GUIstate.Hidden;
			
			SetAdjustNumber(GUI.battle.adjustbox[0], winScore);
			SetAdjustNumber(GUI.battle.adjustbox[1], lifeCount);
			SetAdjustNumber(GUI.battle.adjustbox[2], shotSpeed);
			
			GUI.battle.checkbox[0].data = (infiniteJump) ? Enable : Disable;
			GUI.battle.checkbox[1].data = (noKnockback) ? Enable : Disable;
			GUI.battle.checkbox[2].data = (instantCharge) ? Enable : Disable;
			GUI.battle.checkbox[3].data = (fixedCamera) ? Enable : Disable;
			GUI.battle.checkbox[4].data = (noPile) ? Enable : Disable;
			
			RenderElements(GUI.battle);

			let bgElement = GUI.battle.background[0];

			tempCanvas.width = bgElement.width*guiScale; //guiScale keeps stageIcons sharp in high screen resolutions
			tempCanvas.height = bgElement.height*guiScale;

			if(!menuAnimating)
				stageRowStep = AnimateValue(stageRowStep,stageRow);
			
			let startIndex = Math.floor(stageRowStep)*stageColumnCount;
			let endIndex = Math.ceil(stageRowStep)*stageColumnCount+stageColumnCount*stageColumnCount;
			for(let i = 0; i < Stages.length; i++){ //rendering stagebuttons
				let guiElement = GUI.battle.stagebutton[i];
				
				let border = guiElement.border;

				let iconBgWidth = (bgElement.width-border*stageColumnCount)/stageColumnCount;
				let iconBgHeight = (bgElement.height-border*stageColumnCount)/stageColumnCount;
				guiElement.width = iconBgWidth;
				guiElement.height = iconBgHeight;

				let bgPosX = (iconBgWidth+border)*i - (iconBgWidth+border)*stageColumnCount*Math.floor(i/stageColumnCount);
				let bgPosY = (iconBgHeight+border) * Math.floor(i/stageColumnCount) - (iconBgHeight+border)*stageRowStep;
				guiElement.xDiff = bgPosX;
				guiElement.yDiff = bgPosY;
				
				if(i >= startIndex && i < endIndex){ //only rendering visible icons
					let iconWidth = Math.min(iconBgHeight*(Stages[i].naturalWidth/Stages[i].naturalHeight),iconBgWidth-border*2);
					let iconHeight = Math.min(iconBgWidth*(Stages[i].naturalHeight/Stages[i].naturalWidth),iconBgHeight-border*2);

					let iconPosX = bgPosX+(iconBgWidth-iconWidth)/2;
					let iconPosY = bgPosY+(iconBgHeight-iconHeight)/2;

					tempRender.fillStyle=(selectedOption===guiElement) ? optionBorderHighlightColor : optionBorderColor;
					tempRender.fillRect(bgPosX*guiScale,bgPosY*guiScale,iconBgWidth*guiScale,iconBgHeight*guiScale);

					tempRender.fillStyle="#000000";
					tempRender.fillRect(iconPosX*guiScale,iconPosY*guiScale,iconWidth*guiScale,iconHeight*guiScale);

					tempRender.drawImage(Stages[i],iconPosX*guiScale,iconPosY*guiScale,iconWidth*guiScale,iconHeight*guiScale);
				}
			}

			guiRender.drawImage(tempCanvas,scaledWidthHalf+bgElement.xDiff,scaledHeightHalf+bgElement.yDiff,bgElement.width,bgElement.height);

			if(loadStageCount > 0){
				guiRender.fillStyle="#FF0000AA";
				guiRender.font="40px Arial";
				guiRender.textAlign="center";
				let loadingText = (loadStageCount===1) ? "Loading image" : ("Loading " + loadStageCount + " images");
				guiRender.fillText(loadingText,scaledWidthHalf+bgElement.xDiff+bgElement.width/2,scaledHeightHalf+bgElement.yDiff+bgElement.height/2);
			}
		}
	}
}
function Options(){
	if(activeSubmenu!==GUI.options){
		activeSubmenu = GUI.options;
		selectedOption = GUI.options.adjustbox[0];
		ShowMenu(GUI.options.title);
	}
	if(optionSelected){
		optionSelected=false;
		if(activeOption===null){
			if(selectedOption===cancel || selectedOption.cancel){
				SaveGame();
				HideMenu(GUI.options.title);
			} else if(selectedOption===GUI.options.adjustbox[0] || selectedOption===GUI.options.adjustbox[1])
				activeOption = selectedOption;
			else if(selectedOption.hasOwnProperty("player")){ //playerButtons
				activePlayer = selectedOption.player;
				UpdateInputMethodMenu();
			} else if(selectedOption.type==="inputfield"){ //hasOwnProperty("inputType") also works
				if(Players[activePlayer].inputMethod!==-1){
					activeOption = selectedOption;
					StartKeyBinding(selectedOption.inputType,true);
				}
			} else if(selectedOption.parent.type==="inputfield"){ //inputField add buttons
				if(Players[activePlayer].inputMethod!==-1){
					activeOption = selectedOption;
					StartKeyBinding(selectedOption.parent.inputType,false);
				}
			} else if(selectedOption===GUI.options.dropdown[0]){
				activeOption = selectedOption;
				GUI.options.dropdown[0].selectedItem = GUI.options.dropdown[0].activeItem;
				ShowMenu(GUI.options.dropdown[0]);
			} else if(selectedOption===GUI.options.checkbox[0]){
				guiScaleOn=!guiScaleOn;
				ScreenSize();
			} else if(selectedOption===GUI.options.checkbox[1])
				vsync=!vsync;
		} else if(activeOption===GUI.options.dropdown[0]){
			let selectedInputMethod = GUI.options.dropdown[0].selectedItem;
			if(selectedInputMethod!==GUI.options.dropdown[0].activeItem) //if removed: always resets current keyBindings when inputMethod is chosen
			if(selectedInputMethod<InputMethods.length && selectedOption!==cancel){
				Players[InputMethods[selectedInputMethod].player].inputInfo = {id:"", index:null};
				Players[activePlayer].inputInfo = {id:InputMethods[selectedInputMethod].id, index:InputMethods[selectedInputMethod].index};
				
				UpdateInputMethods(false);
				KeyBindings[activePlayer] = GetDefaultBindings((selectedInputMethod===0) ? defaultKeyboard : defaultGamepad);
			}
			Players[InputMethods[0].player].confirmKey = false;
			HideMenu(GUI.options.dropdown[0]);
		} else {
			selectedOption = activeOption;
			activeOption = null;
		}
	}

	RenderMenu(GUI.options.title);

	if(!menuAnimating || activeOption===GUI.options.dropdown[0]){
		if(selectedOption!==cancel && Players[activePlayer].inputMethod===-1 && (selectedOption.type==="inputfield" || selectedOption.parent.type==="inputfield"))
			selectedOption = GUI.options.adjustbox[0]; //if gamepad is disconnected while an inputfield is selected
		
		for(let i = 0; i < GUI.options.label.length; i++)
			GUI.options.label[i].guiState = (Players[activePlayer].inputMethod!==-1 || i<4) ? GUIstate.Enabled : GUIstate.Disabled;
		
		SetAdjustNumber(GUI.options.adjustbox[0], Math.floor((6-updateInterval)*20));
		SetAdjustNumber(GUI.options.adjustbox[1], Math.round(soundVolume*100));

		GUI.options.checkbox[0].data = (guiScaleOn) ? Enable : Disable;
		GUI.options.checkbox[1].data = (vsync) ? Enable : Disable;
		
		let guiElement = GUI.options.background[0]; //StickAim test area
		guiElement.guiState = (Players[activePlayer].inputMethod!==-1) ? GUIstate.Enabled : GUIstate.Disabled;
		let childElement = guiElement.background[0];
		childElement.guiState = guiElement.guiState; //StickAim test area dot
		childElement.xDiff = guiElement.width/2-(childElement.width/2)+((guiElement.width/2-childElement.width/2-guiElement.border)*Players[activePlayer].aimAxisX);
		childElement.yDiff = guiElement.height/2-(childElement.height/2)+((guiElement.height/2-childElement.height/2-guiElement.border)*Players[activePlayer].aimAxisY);
		
		if(Players[activePlayer].inputMethod!==-1 && !menuAnimating)
			deadzoneSliderWidth = AnimateValue(deadzoneSliderWidth,deadzoneTargetWidth);
		
		for(let i = 0; i < GUI.options.inputfield.length; i++){
			let guiElement = GUI.options.inputfield[i];
			guiElement.guiState = (Players[activePlayer].inputMethod!==-1) ? GUIstate.Enabled : GUIstate.Disabled;
			guiElement.button[0].guiState = guiElement.guiState; //add-button
			if(guiElement.guiState === GUIstate.Enabled){
				let KeyBind = KeyBindings[activePlayer][guiElement.inputType];
				guiElement.axisValue = KeyBind.value;

				let inputName = KeyBind.name;
				if(keyBinding && activeBinding===guiElement.inputType)
					inputName = keyBindingText;
				else if(KeyBind.deadzone===1)
					inputName = "[disabled]";
				guiElement.pText = inputName;
				
				guiElement.deadzone = KeyBind.deadzone;
			} else
				guiElement.pText = "";
		}
		
		for(let i = 0; i < GUI.options.button.length; i++){
			let guiElement = GUI.options.button[i];
			if(guiElement.hasOwnProperty("player")){
				let playerIsActive = (activePlayer === guiElement.player);
				guiElement.textColor = (playerIsActive) ? guiElement.textHighlightColor : PlayerColors[guiElement.player].color;
				guiElement.bgColor = (playerIsActive) ? PlayerColors[guiElement.player].color : optionBgColor;
				guiElement.bgHighlightColor = (playerIsActive) ? PlayerColors[guiElement.player].color : PlayerColors[guiElement.player].fadeColor;
			}
		}
		
		RenderElements(GUI.options);
	}
}
function Pause(){
	if(!pause){
		StopAllSounds();
		pause=true;
		activeMenu = GUI.pause;
		selectedOption = GUI.pause.button[0];
	}
	if(optionSelected && activeSubmenu===null){
		optionSelected=false;
		if(selectedOption.hasOwnProperty("menu")){
			lastOption = selectedOption;
			GUI[selectedOption.menu].run();
		} else if(selectedOption===GUI.pause.button[0] || selectedOption===cancel){
			CloseAllMenus();
			pause=false;
		}
	}

	LogoDraw();
	
	RenderElements(GUI.pause);

	if(activeSubmenu !== null)
		activeSubmenu.run();
}
function ExitGame(){
	if(activeSubmenu!==GUI.exitGame){
		activeSubmenu = GUI.exitGame;
		selectedOption = GUI.exitGame.button[0];
		
		GUI.exitGame.label[0].guiState = (gameMode===GameMode.adventure) ? GUIstate.Enabled : GUIstate.Hidden;
		GUI.exitGame.label[1].guiState = (gameMode===GameMode.battle) ? GUIstate.Enabled : GUIstate.Hidden;
		
		GUI.exitGame.title.yDiff=GUI.exitGame.title.orgYdiff;
		GUI.exitGame.title.xDiff=GUI.exitGame.title.orgXdiff;
		ShowMenu(GUI.exitGame.title);
	}
	if(optionSelected){
		optionSelected=false;
		if(selectedOption===cancel || selectedOption.cancel)
			HideMenu(GUI.exitGame.title);
		else if(selectedOption===GUI.exitGame.button[1]){
			gameStarted=false;
			activeMenu = GUI.main;
			if(gameMode===GameMode.adventure){
				activeSubmenu = null;
				selectedOption = GUI.main.button[0];
			} else {
				activeSubmenu = GUI.battle;
				lastOption = GUI.main.button[1];
				selectedOption = GUI.battle.stagebutton[levelIndex];
				ShowMenu(GUI.battle.title);
			}
		}
	}

	RenderMenu(GUI.exitGame.title);

	if(!menuAnimating)
		RenderElements(GUI.exitGame);
}
function Results(){
	if(activeMenu!==GUI.results){
		StopAllSounds();
		PlaySound(Sounds.confirm);
		pause=true;
		gameStarted=false;
		activeMenu = GUI.results;
		selectedOption = GUI.results.button[0];
		
		let Winners = [];
		for(let pl = 1; pl < Players.length; pl++){
			if(!Players[pl].joined)
				continue;
			if(Winners.length===0 || Players[pl].score < Players[Winners[Winners.length-1][0]].score)
				Winners.push([Players[pl].number]);
			else {
				for(let w = 0; w < Winners.length; w++){
					if(Players[pl].score === Players[Winners[w][0]].score){
						Winners[w].push([Players[pl].number]);
						break;
					}
					if(Players[pl].score > Players[Winners[w][0]].score){
						Winners.splice(w,0,[Players[pl].number]);
						break;
					}
				}
			}
		}
		
		for(let b = 0; b < GUI.results.background.length; b++)
			GUI.results.background[b].guiState = GUIstate.Hidden;
		
		let sizeDiff = 50;
		for(let w = 0; w < Winners.length; w++){
		for(let wi = 0; wi < Winners[w].length; wi++){ //if multiple players have the same score
			let playerBar = GUI.results.background[Winners[w][wi]-1];
			playerBar.guiState = GUIstate.Enabled;
			
			let barLabel = playerBar.label[0];
			barLabel.data = WinnerTexts[w];
			if(w===0){
				barLabel.textWidth = 15;
				barLabel.textHeight = 14;
				barLabel.textXoffset = 8;
			} else if(w===1){
				barLabel.textWidth = 12;
				barLabel.textHeight = 11;
				barLabel.textXoffset = 9;
			} else if(w===2){
				barLabel.textWidth = 9;
				barLabel.textHeight = 8;
				barLabel.textXoffset = 30;
			} else if(w===3){
				barLabel.textWidth = 6;
				barLabel.textHeight = 5;
				barLabel.textXoffset = 42;
			}
			
			playerBar.yDiff = playerBar.orgYdiff+sizeDiff*w;
			playerBar.height = playerBar.orgHeight-sizeDiff*w;
			playerBar.textYoffset = sizeDiff*(4-w)-playerBar.border*2;
		}
		}

		ShowMenu(GUI.results.title);
	}
	if(optionSelected){
		optionSelected=false;
		if(selectedOption.hasOwnProperty("menu")){
			activeMenu = GUI.main;
			if(GUI[selectedOption.menu]===GUI.battle){
				activeSubmenu = GUI.battle;
				lastOption = GUI.main.button[1];
				selectedOption = GUI.battle.stagebutton[levelIndex];
				ShowMenu(GUI.battle.title);
			} else //mainMenu
				selectedOption = GUI.main.button[1];
		} else if(selectedOption===GUI.results.button[0]){
			CloseAllMenus();
			InitializeGame(levelIndex);
		}
	}

	RenderMenu(GUI.results.title);

	if(!menuAnimating)
		RenderElements(GUI.results);
	
}
function RenderPlainText(element){
	if(element.pText === "" || element.guiState === GUIstate.Hidden)
		return;
	
	guiRender.fillStyle=element.pTextColor;
	guiRender.font=element.pFontSize+"px Arial";
	guiRender.textAlign=element.pTextAlign;
	
	let textXpos = scaledWidthHalf+element.xDiff+element.pTextXoffset+(element.parent.xDiff || 0); //?? 0
	let textYpos = scaledHeightHalf+element.yDiff+element.pTextYoffset+(element.parent.yDiff || 0); //?? 0
	
	if(guiRender.textAlign === "right" || guiRender.textAlign === "end")
		textXpos += element.width;
	else if(guiRender.textAlign === "center")
		textXpos += element.width/2;
	
	textYpos += element.height;
	
	if(element.pTextWidth===0)
		guiRender.fillText(element.pText,textXpos,textYpos);
	else
		guiRender.fillText(element.pText,textXpos,textYpos,element.pTextWidth-Math.abs(element.pTextXoffset*2));
}
function RenderText(element){
	if(element.guiState === GUIstate.Hidden)
		return;
	
	if(element.data !== null){
		guiRender.beginPath();
		guiRender.lineWidth = element.textBorder*2;
		guiRender.setLineDash([]);
		guiRender.strokeStyle = element.textBorderColor;
		
		if(element.selected)
			guiRender.fillStyle = element.textHighlightColor;
		else if(element.guiState === GUIstate.Enabled)
			guiRender.fillStyle = element.textColor;
		else
			guiRender.fillStyle = element.textFadeColor;
		
		for(let py = 0; py < element.data.length; py++){
			for(let px = 0; px < element.data[py].length; px++){
				if(element.data[py][px] === 1){
					guiRender.rect(
						scaledWidthHalf+element.xDiff+element.textXoffset+px*(element.textWidth+element.textXgap)+(element.parent.xDiff || 0), //?? 0
						scaledHeightHalf+element.yDiff+element.textYoffset+py*(element.textHeight+element.textYgap)+(element.parent.yDiff || 0), //?? 0
						element.textWidth,
						element.textHeight
					);
				}
			}
		}
		
		if(element.textBorder>0)
			guiRender.stroke();
		
		guiRender.fill();
	}
	RenderPlainText(element);
}
function RenderOption(element){
	if(element.guiState === GUIstate.Hidden)
		return;
	
	if(element.selected){
		guiRender.strokeStyle = element.borderHighlightColor;
		guiRender.fillStyle = element.bgHighlightColor;
	} else if(element.guiState === GUIstate.Enabled){
		guiRender.strokeStyle = element.borderColor;
		guiRender.fillStyle = element.bgColor;
	} else {
		guiRender.strokeStyle = element.borderFadeColor;
		guiRender.fillStyle = element.bgFadeColor;
	}
	
	let rectX = scaledWidthHalf+element.xDiff+element.border/2-element.padding+(element.parent.xDiff || 0); //?? 0
	let rectY = scaledHeightHalf+element.yDiff+element.border/2-element.padding+(element.parent.yDiff || 0); //?? 0
	let rectW = element.width-element.border+element.padding*2;
	let rectH = element.height-element.border+element.padding*2;
	
	guiRender.beginPath();
	guiRender.rect(rectX,rectY,rectW,rectH);
	guiRender.fill();
	
	if(element.border>0){
		guiRender.lineWidth = element.border;
		guiRender.setLineDash([]);
		guiRender.stroke();
	}

	RenderText(element);
	
	RenderElements(element); //for child-elements
}
function RenderElements(parentGUI){ //elements are rendered in this order
	if(parentGUI.hasOwnProperty("background")){
		for(let b = 0; b < parentGUI.background.length; b++)
			RenderOption(parentGUI.background[b]);
	}
	if(parentGUI.hasOwnProperty("label")){
		for(let l = 0; l < parentGUI.label.length; l++)
			RenderText(parentGUI.label[l]);
	}
	if(parentGUI.hasOwnProperty("number")){
		for(let n = 0; n < parentGUI.number.length; n++){
			parentGUI.number[n].selected = (activeOption===parentGUI);
			RenderText(parentGUI.number[n]);
		}
	}
	let elementTypes = Object.getOwnPropertyNames(parentGUI);
	for(let t = 0; t < elementTypes.length; t++){ //rest of the elements
		let elementType = elementTypes[t];
		if(elementType !== "button" && elementType !== "checkbox" && elementType !== "inputfield" && elementType !== "adjustbox")
			continue; //stagebuttons are rendered manually and dropdowns are rendered last
		for(let e = 0; e < parentGUI[elementType].length; e++){ //only checking elements that are inside an array (ignores title)
			let element = parentGUI[elementType][e];
			if(GUI[element.menu]===CurrentMenu())
				continue;
			
			element.selected = (selectedOption===element);
			
			RenderOption(element);
			
			if(element.guiState !== GUIstate.Enabled)
				continue;
			
			if(elementType === "inputfield"){
				for(let axis = 0; axis < element.axisValue.length; axis++){
					let barHeight = (element.height-element.border*2)/element.axisValue.length;
					guiRender.fillStyle="#CCCC00"; //"#FFFF00CC" and remove RenderPlainText?
					guiRender.fillRect(
						scaledWidthHalf+element.xDiff+element.border,
						scaledHeightHalf+element.yDiff+element.border+barHeight*axis,
						(element.width-element.border*2)*element.axisValue[axis],
						barHeight
					); //AxisValue-bar
				}
				
				RenderPlainText(element);
				
				guiRender.fillStyle="#FF0000";
				guiRender.fillRect(
					scaledWidthHalf+element.xDiff+((element.width-deadzoneSliderWidth)*element.deadzone),
					scaledHeightHalf+element.yDiff,
					deadzoneSliderWidth,
					element.height
				); //Deadzone-line
			}
		}
	}
	if(parentGUI.hasOwnProperty("dropdown")){
		for(let d = 0; d < parentGUI.dropdown.length; d++){
			let element = parentGUI.dropdown[d];
			element.selected = (selectedOption===element && activeOption!==element);
			element.pText = (activeOption!==element) ? element.item[element.activeItem].pText : "";
			element.targetHeight = element.item.length*element.orgHeight;
			RenderOption(element);
			
			if(activeOption===element && !menuAnimating){
				element.width = element.targetWidth;
				element.height = element.targetHeight;
				let itemHeight = (element.height-element.border*2)/element.item.length;
				let itemIndex = 1;
				for(let item = 0; item < element.item.length; item++){
					let yDis = element.border;
					if(element.activeItem !== item){ //not active item (active item is at the top of the list)
						yDis += itemIndex*itemHeight;
						itemIndex++;
					}
					element.item[item].xDiff = element.border;
					element.item[item].yDiff = yDis;
					element.item[item].width = element.width-element.border*2;
					element.item[item].pTextWidth = element.item[item].width;
					element.item[item].height = itemHeight;
					element.item[item].pTextAlign = element.pTextAlign;
					element.item[item].pFontSize = element.pFontSize;
					element.item[item].pTextXoffset = element.pTextXoffset;
					element.item[item].pTextYoffset = -itemHeight/2+element.pFontSize*0.3; //wow
					
					element.item[item].selected = (element.selectedItem===item);
					
					RenderOption(element.item[item]);
				}
			}
		}
	}
}
function RenderMenu(element){
	guiRender.beginPath();
	guiRender.lineWidth = element.border;
	guiRender.setLineDash([]);
	guiRender.strokeStyle = element.borderColor;
	guiRender.fillStyle = element.bgColor;
	
	guiRender.rect(
		scaledWidthHalf+element.xDiff+element.border/2,
		scaledHeightHalf+element.yDiff+element.border/2,
		element.width-element.border,
		element.height-element.border
	);
	guiRender.fill();
	
	if(element.border>0)
		guiRender.stroke();

	guiRender.beginPath();
	let cancelKey = (selectedOption===cancel && activeOption===null); //title is also highlighted when cancel-key is pressed
	guiRender.strokeStyle = (cancelKey || selectedOption===element) ? element.borderHighlightColor : element.borderColor;
	guiRender.fillStyle = element.fgColor;
	guiRender.rect(
		scaledWidthHalf+element.xDiff+element.border/2,
		scaledHeightHalf+element.yDiff+element.border/2,
		element.orgWidth-element.border,
		element.orgHeight-element.border
	); //titleBg
	guiRender.fill();
	
	if(element.border>0)
		guiRender.stroke();

	RenderText(element);
}
function AnimateValue(current,target,animThreshold=0,animSteps={steps:steps}){ //animSteps for multiple chained animations
	if(current===target)
		return current;
	
	let animDistance = target-current;
	let multipliedAnimForce = animForce*speedMultiplier;
	let multipliedAnimThreshold = animThreshold*speedMultiplier;
	
	while(animSteps.steps >= 1){
		animSteps.steps--;
		current+=animDistance*multipliedAnimForce;
		current+=Math.sign(animDistance)*multipliedAnimThreshold;
		
		let newAnimDistance = target-current;
		if(Math.sign(newAnimDistance)!==Math.sign(animDistance)){ //|| Math.abs(newAnimDistance)<multipliedAnimThreshold ?
			current=target;
			break;
		}
		animDistance = newAnimDistance;
	}
	return current;
}
function AnimateElement(element,animProperties){
	let animationDone = true;
	let animSteps = {steps:steps};
	for(let ap = 0; ap < animProperties.length; ap++){
		let prop = animProperties[ap][0];
		let target = animProperties[ap][1];
		
		element[prop] = AnimateValue(element[prop],element[target],menuAnimThreshold,animSteps);
		
		if(element[prop]!==element[target]){
			animationDone=false;
			if(!GUI.logo.secret) //animSteps.steps is < 1 so break to avoid unnecessary loop iterations
				break;
		}
		if(GUI.logo.secret)
			animSteps.steps = steps;
	}
	return animationDone;
}
function AnimateMenu(){
	let animProperties = (animMenu.show) ?
	[["xDiff","targetXdiff"],["yDiff","targetYdiff"],["width","targetWidth"],["height","targetHeight"]] :
	[["height","orgHeight"],["width","orgWidth"],["yDiff","orgYdiff"],["xDiff","orgXdiff"]];
	
	menuAnimating = !AnimateElement(animMenu.menu,animProperties);
	if(!menuAnimating){
		if(!animMenu.show){
			if(activeOption===null){ //submenu active
				selectedOption = lastOption;
				activeSubmenu = null;
			} else //option active
				selectedOption = activeOption;
			
			activeOption = null;
		}
		animMenu = null;
	}
}
function ShowMenu(element){
	if(!menuAnimating){
		element.width = element.orgWidth;
		element.height = element.orgHeight;
		menuAnimating = true;
		animMenu = {menu:element,show:true};
	}
}
function HideMenu(element){
	if(!menuAnimating){
		menuAnimating = true;
		animMenu = {menu:element,show:false};
	}
}
function PlayerConfirmWindow(){
	for(let pl = 1; pl < Players.length; pl++){
		let playerSlot = GUI.playerConfirm.background[pl-1];
		
		playerSlot.selected = playerSlot.background[0].selected = Players[pl].joined;
		playerSlot.guiState = playerSlot.background[0].guiState = ((Players[pl].inputMethod!==-1) ? GUIstate.Enabled : GUIstate.Disabled);
		
		playerSlot.background[0].pFontSize = playerSlot.background[0].orgPfontSize;
		if(playerSlot.selected)
			playerSlot.background[0].pText = "OK";
		else if(playerSlot.guiState === GUIstate.Enabled){
			let keyText = ""+KeyBindings[Players[pl].number][Input.confirm].name;
			playerSlot.background[0].pFontSize = "bold "+Math.floor(260/(keyText.length+12));
			playerSlot.background[0].pText = "Press "+keyText+" to join";
		} else
			playerSlot.background[0].pText = "No input";
	}

	if(firstJoined !== 0){
		GUI.playerConfirm.label[1].pText = "P"+firstJoined+": Press "+KeyBindings[firstJoined][Input.pause].name+" to continue";
		GUI.playerConfirm.label[1].guiState = GUI.playerConfirm.label[2].guiState = GUIstate.Enabled;
	} else
		GUI.playerConfirm.label[1].guiState = GUI.playerConfirm.label[2].guiState = GUIstate.Hidden;
	
	RenderElements(GUI.playerConfirm);
}
function ConfirmPlayers(){
	if(firstJoined === 0)
		return;
	
	playerConfirm = false;
	selectedOption = (activeSubmenu===GUI.adventure) ? GUI.adventure.button[0] : GUI.battle.dropdown[0];
	
	let menuElement = (activeSubmenu===GUI.adventure) ? GUI.adventure.title : GUI.battle.title;
	menuElement.targetHeight = menuElement.orgTargetHeight;
	menuAnimating = true;
	animMenu = {menu:menuElement,show:true};
	
	PlaySound(Sounds.confirm);
}
let timeoutTimer = 0;
function KeyBindingTimer(){
	if(activeBinding < Input.aimXneg)
		keyBindingText = "Waiting input..."+timeoutTimer;
	else
		keyBindingText = "Waiting..."+timeoutTimer;
	
	timeoutTimer--;
	if(timeoutTimer<0)
		StopKeyBinding();
}
let timeoutInterval;
function StartKeyBinding(binding,reset){
	keyBinding = true;
	activeBinding = binding;
	resetBinding = reset;
	
	gamepadTemp = {axisValues:[],buttonValues:[]};
	oldMouseX = mouseX;
	oldMouseY = mouseY;
	
	timeoutTimer = keyBindingTimeout;
	KeyBindingTimer();
	timeoutInterval = setInterval(KeyBindingTimer, 1000);
}
function StopKeyBinding(){
	keyBinding = false;
	
	gamepadTemp = null;
	activeOption = null;
	
	clearInterval(timeoutInterval);
}
function Clamp(value,min,max){
	return Math.min(Math.max(value, min), max);
}
function DebugInfo(){
	guiRender.fillStyle="#00FF00";
	guiRender.font="15px Arial";
	
	let xPos=0, yPos=0;
	guiRender.textAlign="left";
	
	if(gameStarted && activeMenu===null){
		guiRender.fillText("Level: X:"+levelPosX.toFixed(1)+"  Y:"+levelPosY.toFixed(1)+"  Width:"+terrain.canvas.width+"  Height:"+terrain.canvas.height+"  AreaScale: "+areaScale.toFixed(4)+((fixedCamera) ? "(fixed)" : "("+1*aimArea.toFixed(2)+"|"+1*aimMargin.toFixed(4)+")"),4,20);
		
		let pCount = 0;
		for(let p = 1; p < Players.length; p++){
			let player = Players[p];
			if(!player.joined)
				continue;
			
			yPos = pCount*90;
			guiRender.fillText("P"+p+") X:"+player.playerPosX.toFixed(1)+"  Y:"+player.playerPosY.toFixed(1)+"  Width:"+player.playerWidth+"  Height:"+player.playerHeight+"  SizeLevel:"+player.sizeLevel,4,50+yPos);
			guiRender.fillText("PixelCount:"+player.pixelCount.toFixed(0)+"  PixelCountMax:"+player.pixelCountMax+"  BallCount:"+player.Balls.length,40,70+yPos);
			guiRender.fillText("Momentum: X:"+player.momentumX.toFixed(3)+"  Y:"+player.momentumY.toFixed(3)+"  Rotation:"+player.rotMomentum.toFixed(3),40,90+yPos);
			guiRender.fillText("JumpTimer: "+player.jumpTimer+"  OnGround: "+player.onGround,40,110+yPos);
			
			pCount++;
		}
	}
	for(let p = 0; p < Players.length; p++){
		let playerInputs = KeyBindings[p].map(i => "["+i.value.map(v => +v.toFixed(3))+"]");
		guiRender.fillText("P"+p+") "+playerInputs,xPos,scaledHeight+20*(p-5));
	}
	
	xPos = scaledWidth-4;
	guiRender.textAlign="right";
	guiRender.fillText("[Home/End]UpdateInterval: "+updateInterval+"ms",xPos,60);
	guiRender.fillText("[PgUp/PgDn]SpeedMultiplier: "+speedMultiplier+"x",xPos,80);
	guiRender.fillText("Mode: "+Object.keys(GameMode)[gameMode]+" Type: "+Object.keys(GameType)[gameType],xPos,100);
	
	guiRender.fillText("shotSpeed: "+shotSpeed,xPos,scaledHeight-230);
	guiRender.fillText("[1]noClip: "+noClip,xPos,scaledHeight-210);
	guiRender.fillText("[2]noBounds: "+noBounds,xPos,scaledHeight-190);
	guiRender.fillText("[3]noCollect: "+noCollect,xPos,scaledHeight-170);
	guiRender.fillText("[4]noGrow: "+noGrow,xPos,scaledHeight-150);
	guiRender.fillText("[5]noPile: "+noPile,xPos,scaledHeight-130);
	guiRender.fillText("[6]noKnockback: "+noKnockback,xPos,scaledHeight-110);
	guiRender.fillText("[7]collectCharge: "+collectCharge,xPos,scaledHeight-90);
	guiRender.fillText("[8]instantCharge: "+instantCharge,xPos,scaledHeight-70);
	guiRender.fillText("[9]wallJump: "+wallJump,xPos,scaledHeight-50);
	guiRender.fillText("[0]infiniteJump: "+infiniteJump,xPos,scaledHeight-30);
	guiRender.fillText("[J/L]stage-/+  [,]frameHold  [.]frameStep",xPos,scaledHeight-10);
	guiRender.fillText("[N/M]pixelScale: "+pixelScale+"%("+pixelRatio+") [X]guiScale: "+guiScale.toFixed(4)+" [Z]smooth: "+imageSmooth+" [C]noClear: "+noClear+" [V]vsync: "+vsync,scaledWidth-4,40);
	
	PerfInfo.Update(TimeNow());
	guiRender.fillText(1*screenWidth.toFixed(4)+"x"+1*screenHeight.toFixed(4)+" | "+PerfInfo.frameInfo+" | "+PerfInfo.fpsInfo,scaledWidth-5,20);
}
function LogoDraw(){
	let mouseIsDrawing = false;
	let GLogo = GUI.logo;
	if(mouseDraw!==-1){
		GLogo.width = (GLogo.textWidth+GLogo.textXgap)*GLogo.data[0].length+GLogo.textXoffset;
		GLogo.height = (GLogo.textHeight+GLogo.textYgap)*GLogo.data.length+GLogo.textYoffset;
		
		if(MouseOver(GLogo)){
			let Ydis = mouseY-(scaledHeightHalf+GLogo.yDiff);
			let Xdis = mouseX-(scaledWidthHalf+GLogo.xDiff);
			let dataY = Math.floor(Ydis/GLogo.height*GLogo.data.length);
			let dataX = Math.floor(Xdis/GLogo.width*GLogo.data[0].length);
			let newData = (mouseDraw===0) ? 1 : 0;
			
			if(GLogo.data[dataY][dataX] !== newData || !GLogo.drawStarted){
				GLogo.data[dataY][dataX] = newData;
				mouseIsDrawing = true;
			}
			//GLogo.secret=false; //not needed because there are almost always empty pixels in logo when secret is active
		}
	}
	
	if(GLogo.secret || mouseIsDrawing){
		GLogo.secret = GLogo.drawStarted;
		for(let py = 0; py < GLogo.data.length; py++){
			for(let px = 0; px < GLogo.data[py].length; px++){
				if(!GLogo.drawStarted)
					GLogo.data[py][px] = 0; //clear all pixels
				else if(!mouseIsDrawing) //GLogo.secret is true
					GLogo.data[py][px] = Math.floor(Math.random() * 2); //set random pixels
				else if(GLogo.data[py][px]===0)
					GLogo.secret = false;
			}
		}
		GLogo.drawStarted = true;
		if(GLogo.secret && mouseIsDrawing)
			mouseDraw = -1;
	}
	let newBorder = (mouseDraw!==-1) ? 1 : 0;
	if(GLogo.border !== newBorder){
		GLogo.border = newBorder;
		if(newBorder===0)
			LogoSave();
	}
	
	RenderOption(GLogo);
}
function LogoSave(){
	if(GUI.logo.drawStarted){
		localStorage.setItem('GUIlogo',JSON.stringify(GUI.logo.data));
		localStorage.setItem('GUIsecret',GUI.logo.secret);
	}
}
function LogoLoad(){
	let loadedGUIlogo = JSON.parse(localStorage.getItem('GUIlogo'));
	let loadedGUIsecret = localStorage.getItem('GUIsecret');
	
	if(loadedGUIlogo!==null){
		GUI.logo.data = loadedGUIlogo;
		GUI.logo.drawStarted = true;
		GUI.logo.secret = (loadedGUIsecret==="true");
	}
}
function SaveGame(){ //add exeption?: Can not save
	localStorage.setItem('vsync',vsync);
	localStorage.setItem('guiScaleOn',guiScaleOn);
	localStorage.setItem('updateInterval',updateInterval);
	localStorage.setItem('soundVolume',soundVolume);
	localStorage.setItem('KeyBindings',JSON.stringify(KeyBindings));
	
	let PlayerInputInfo = [];
	for(let pl = 1; pl < Players.length; pl++)
		PlayerInputInfo.push({id:Players[pl].inputInfo.id, index:null}); //index not stored
	localStorage.setItem('PlayerInputInfo',JSON.stringify(PlayerInputInfo));
	
	//LogoSave(); //not needed
}
function LoadGame(){
	let loadedVsync = localStorage.getItem('vsync');
	let loadedGuiScaleOn = localStorage.getItem('guiScaleOn');
	let loadedUpdateInterval = localStorage.getItem('updateInterval');
	let loadedSoundVolume = localStorage.getItem('soundVolume');
	let loadedKeyBindings = JSON.parse(localStorage.getItem('KeyBindings'));
	let loadedPlayerInputInfo = JSON.parse(localStorage.getItem('PlayerInputInfo'));
	
	if(loadedVsync!==null)
		vsync = (loadedVsync==="true");
	
	if(loadedGuiScaleOn!==null)
		guiScaleOn = (loadedGuiScaleOn==="true");
	
	if(loadedUpdateInterval!==null){
		loadedUpdateInterval = Number(loadedUpdateInterval);
		if(!Number.isNaN(loadedUpdateInterval)){
			updateInterval = loadedUpdateInterval;
			UpdateMultiplier(updateInterval);
		}
	}
	
	if(loadedSoundVolume!==null){
		loadedSoundVolume = Number(loadedSoundVolume);
		if(!Number.isNaN(loadedSoundVolume)){
			soundVolume = loadedSoundVolume;
		}
	}
	
	if(loadedKeyBindings!==null){
		KeyBindings = loadedKeyBindings;
		ResetKeyValues();
	}
	
	if(loadedPlayerInputInfo!==null){
		for(let pl = 1; pl < Players.length; pl++)
			Players[pl].inputInfo = loadedPlayerInputInfo[pl-1];
	}
	
	UpdateInputMethods(true);
	
	LogoLoad();
}
let initLevels = false;
let previousWidth = 0;
let previousHeight = 0;
function InitializeLevels(){
	if(skipAdventure){
		for(let l = 0; l < Levels.length; l++)
			Levels[l].src = ""; //cancel load
		
		Levels = [];
		loadLevelCount = 0;
		initLevelCount = 0;
		return;
	}
	if(initLevelCount>1)	
		setTimeout(InitializeLevels, 0);
	
	let i = Levels.length-initLevelCount;
	
	Levels[i].canvas = document.createElement('canvas');
	Levels[i].canvas.width = Levels[i].naturalWidth;
	Levels[i].canvas.height = Levels[i].naturalHeight;
	
	if(i > 0){
		previousWidth += Levels[i-1].canvas.width;
		previousHeight += Math.min(Levels[i-1].canvas.height-Levels[i].canvas.height,0); //top of next level is always at the same height or higher than the previous one
	}
	Levels[i].xOffset = previousWidth;
	Levels[i].yOffset = previousHeight;
	
	Levels[i].render = Levels[i].canvas.getContext('2d');
	Levels[i].render.drawImage(Levels[i], 0, 0);

	Levels[i].colData = CreateColData(Levels[i].render.getImageData(0, 0, Levels[i].canvas.width, Levels[i].canvas.height).data);
	
	initLevelCount--;
}
let initStages = false;
tempCanvas.width = GUI.battle.background[0].width;
tempCanvas.height = GUI.battle.background[0].height;
function InitializeStages(){
	if(initStageCount>1)
		setTimeout(InitializeStages, 0);
	
	let i = Stages.length-initStageCount;
	
	tempRender.drawImage(Stages[i],0,0,tempCanvas.width,tempCanvas.height); //cache stages
	AddStageButton(i,Stages[i].naturalWidth,Stages[i].naturalHeight);
	
	initStageCount--;
}
let loadingBarProgress = 0, loadingBarTarget = 0;
function LoadingScreen(){
	let totalLoadCount = Levels.length*2+Stages.length*2+Object.keys(Sounds).length+Crosshair.length;
	loadingBarTarget = (totalLoadCount-loadLevelCount-loadStageCount-loadSoundCount-loadCrossCount-initLevelCount-initStageCount)/totalLoadCount;
	
	if(Stages.length>0 && !initStages && loadStageCount===0){
		initStages = true;
		InitializeStages();
	} if(Levels.length>0 && !initLevels && (loadLevelCount===0 || skipAdventure)){
		initLevels = true;
		InitializeLevels();
	}

	if(loadingBarProgress < 1)
		loadingBarProgress = AnimateValue(loadingBarProgress,loadingBarTarget,0.0001);
	else if(!loadingDone){
		if(Levels.length===0){
			GUI.main.button[0].guiState = GUIstate.Disabled;
			selectedOption = GUI.main.button[1];
		} else
			selectedOption = GUI.main.button[0];
		
		loadingDone = true;
		activeMenu = GUI.main;
	}

	let barX = scaledWidthHalf-150;
	let barY = scaledHeightHalf-20;
	let barWidth = 300;
	let barHeight = 40;
	let barBorder = 2;
	let barInnerX = barX+barBorder;
	let barInnerY = barY+barBorder;
	let barInnerWidth = (barWidth-barBorder*2);
	let barInnerHeight = (barHeight-barBorder*2);
	
	guiRender.fillStyle = menuBorderColor;
	guiRender.fillRect(barX, barY, barWidth, barHeight);
	
	guiRender.fillStyle = "#000000";
	guiRender.fillRect(barInnerX+barInnerWidth*loadingBarProgress, barInnerY, barInnerWidth*(1-loadingBarProgress), barInnerHeight);
	
	guiRender.fillStyle = "#FFFFFFCC";
	guiRender.font = "20px Arial";
	guiRender.textAlign = "left";
	guiRender.fillText("Version "+version,3,scaledHeight-3);
	
	guiRender.fillText("- F or F4 to enable fullscreen",3,20);
	guiRender.fillText("- Drop an image file into the game to set it as the background",3,45);
	guiRender.fillText("- Add stages by dropping images at stage selection",3,70);
	
	if(loadingDone){
		guiRender.fillStyle = "#000000";
		guiRender.font = "30px Arial";
		guiRender.textAlign = "center";
		guiRender.fillText("Click to start",scaledWidthHalf,scaledHeightHalf+10);
	} else if(!skipAdventure){
		guiRender.textAlign = "center";
		guiRender.fillText("(Click to skip Adventure load)",scaledWidthHalf,scaledHeightHalf+50);
	}
}
function GameLoop(){ //main loop
	if(vsync)
		window.requestAnimationFrame(GameLoop);
	else
		setTimeout(GameLoop, 0);
	
	gameCanvas.style.cursor = (gameStarted && activeMenu===null) ? 'none' : 'auto';
	
	CheckGamepads(); //polling gamepad inputs
	
	let currentTime = TimeNow();
	if((!frameHold && (currentTime-lastTime>=updateInterval)) || frameStep){ //maximum UpdateRate (1ms)
		steps = (frameStep) ? 1 : (currentTime-lastTime)/updateInterval + (steps%1);
		lastTime = currentTime;
		frameStep = false;
		
		if(!noClear)
			gameRender.clearRect(0, 0, screenWidth, screenHeight);
		
		guiRender.clearRect(0, 0, scaledWidth, scaledHeight);
		
		if(loadingScreen)
			LoadingScreen();
		else if(activeMenu !== null){
			activeMenu.run();
			if(menuAnimating)
				AnimateMenu();
		} else if(gameStarted && !pause)
			GameLogic();
		
		if(debugMode)
			DebugInfo();
		
		gameRender.drawImage(guiCanvas, 0, 0);
	}
}
LoadGame();
ScreenSize();
GameLoop();
