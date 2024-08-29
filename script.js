// ==UserScript==
// @name        Youtube: Security puzzle
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/
// @match       *://*.youtube.com/*
// @match       *://*.youtu.be/*
// @grant       none
// @version     1.0
// @author      woynert
// @description 2/3/2023, 7:30:24 PM
// @grant GM_addStyle
// @grant GM_getValue
// @grant GM.getValue
// @grant GM.setValue
// @grant GM_setValue
// @grant GM_registerMenuCommand
// @grant unsafeWindow
// @run-at document-start
// ==/UserScript==

console.log("STARTING SECURITY PUZZLE");

// page fully loaded
document.addEventListener('DOMContentLoaded', function() {
	console.log("Im done loading");
	DOMInjector.init();
	DOMInjector.setup_puzzle();
	main();
	checkURL();
    setInterval(checkURL, 4000);
}, false);

let prevURL = null;
let securityActivated    = true;
let buttonToggleSecurity = null;

// ============================================================================
// PUZZLE LOGIC
// ============================================================================

let puzzleFullscreen = null;
let puzzleLabel  = null;
let puzzleInput  = null;
let puzzleButtonNext = null;
let puzzleButtonBack = null;
let phrases = [ "Demo" ];
const minimunPhraseLength = 45;

let currentPhrase    = "";
let currentUserInput = "";

function randomi(limit){
	return Math.floor(Math.random() * (limit));
}

function highlight(text, cssClass, from, to){
	return text.substr(0, from) + "<mark class='" + cssClass + "'>" +
		text.substr(from, to - from) + "</mark>" +
		text.substr(to, text.length);
}

function updateErrorCheck(){

	// check the value is being written and not pasted
	if (Math.abs(currentUserInput.length - puzzleInput.value.length) > 20){
		puzzleInput.value = "";
		currentUserInput  = puzzleInput.value;
		return;
	}

	// update
	currentUserInput = puzzleInput.value;

	let error = false;
	let txtOriginal  = currentPhrase;
	let txtInput     = currentUserInput;
	let idxLastSpace = 0;
	let idxError     = txtOriginal.length;

	// check there is no error
	for (let i = 0; i < txtOriginal.length; i++){
		let charO = txtOriginal[i];
		let charI = txtInput[i];

		if (charO !== charI){
			error = true;
			idxError = i;
			break;
		}

		if (charO === " "){
			idxLastSpace = i+1;
		}

	}

	// set label text formatting
	const formattedText =
		highlight(
			currentPhrase.substr(0, idxError),
			"mark-good", 0, idxError) +
		highlight(
			currentPhrase.substr(idxError, txtOriginal.length),
			"mark-bad", 0, txtInput.length - idxError);

	puzzleLabel.innerHTML = formattedText;

	// show button
	if (!error) {
		puzzleButtonNext.style.visibility = "inherit";
		puzzleInput.disabled = true;
	}
}

function chooseRandomPhrase(){
	let randPhrase = phrases[randomi(phrases.length)];
	console.log(randPhrase);

	currentPhrase = randPhrase;

	if (currentPhrase.length < minimunPhraseLength){
		randPhrase = phrases[randomi(phrases.length)];
		console.log(randPhrase);
		console.log("DOUBLE");

		currentPhrase += " " + randPhrase;
	}

	// if it's late, then add two more phrases. (9 PM)
	const currentHour = new Date().getHours();
	if (currentHour >= 21 || currentHour <= 4){
		randPhrase = phrases[randomi(phrases.length)];
		console.log(randPhrase);
		currentPhrase += " " + randPhrase;

		randPhrase = phrases[randomi(phrases.length)];
		console.log(randPhrase);
		currentPhrase += " " + randPhrase;

		randPhrase = phrases[randomi(phrases.length)];
		console.log(randPhrase);
		currentPhrase += " " + randPhrase;

		console.log("TRIPLE");
	}
}

function startPuzzle(){

	if (securityActivated) {
		puzzleFullscreen.style.visibility = "visible";
		puzzleButtonNext.style.visibility = "hidden";
		puzzleInput.disabled = false;
		puzzleInput.value    = "";
		currentUserInput     = puzzleInput.value;
		updateErrorCheck();
	}
	else{
		// trigger lock
		console.log("lock");

		prevURL = null;
		checkURL();

		securityActivated = true;

		// generate on lock only. So it cannot be forcibly updated.
		chooseRandomPhrase();
		updateButtonToggleSecurity();
	}

}

function endPuzzle(successful){
	puzzleFullscreen.style.visibility = "hidden";

	if (successful) {

		if (currentPhrase !== currentUserInput){
			console.log("Phrases don't match");
			return;
		}

		console.log("unlock");

		// reset
		DOMInjector.setStyleEmpty();
		// hide al kind of recommended videos
		DOMInjector.setStyle( DOMInjector.getStyleRecomendedVideosRecopilation() );

		securityActivated = false;
		updateButtonToggleSecurity();
	}

}

function updateButtonToggleSecurity() {
	if (securityActivated){
    buttonToggleSecurity.innerHTML = "Necesito ver este video<br>de forma honesta 🧘️🧘‍♂️️🧘‍♀️️";
		//buttonToggleSecurity.textContent = "Necesito ver este video<br>de forma honesta 🧘️🧘‍♂️️🧘‍♀️️";
		buttonToggleSecurity.classList.remove("securityButton-unlocked");
	}
	else {
		buttonToggleSecurity.innerHTML = "🚨️ Más vale tarde que nunca, <b>levantate</b> 🙏️";
		buttonToggleSecurity.classList.add("securityButton-unlocked");
	}

}

function main(){


	buttonToggleSecurity = document.getElementById("securityButtonToggle");
	puzzleFullscreen = document.getElementById("puzzleFullscreen");
	puzzleLabel  = document.getElementById("puzzleLabel");
	puzzleInput  = document.getElementById("puzzleInput");
	puzzleButtonNext = document.getElementById("puzzleButtonNext");
	puzzleButtonBack = document.getElementById("puzzleButtonBack");

	// create events
	buttonToggleSecurity.addEventListener("click", ()=>{ startPuzzle(); });
	puzzleButtonBack    .addEventListener("click", ()=>{ endPuzzle(false); });
	puzzleButtonNext    .addEventListener("click", ()=>{ endPuzzle(true); });
	puzzleInput         .addEventListener("input", ()=>{ updateErrorCheck(); });

	chooseRandomPhrase();
}

// ============================================================================
// URL checking
// ============================================================================



// create interval

function checkURL(){

	if (location.href === prevURL) {
		return;
	}

	// update lock button
	securityActivated = true;
	updateButtonToggleSecurity();

	console.log(`page change: ${prevURL} -> ${location.href}\npathname: ${location.pathname}`);
	prevURL = location.href;

    // ignore youtube studio
    if (location.hostname === 'studio.youtube.com') return;

	// video viewer or shorts video viewer
	if (location.pathname === '/watch' || ((location.href).indexOf("shorts") > -1)) {

		// playlist
		if ((location.href).indexOf("&list=")  > -1) {
			console.log('Loading: video viewer Playlist');
			DOMInjector.setStyle(
				DOMInjector.getStyleGeneralPage() +
				DOMInjector.getStyleGeneralVideoViewerPage() +
				DOMInjector.getStylePlayListVideoViewerPage()
			);
		}

		else{
			console.log('Loading: video viewer');
			DOMInjector.setStyle(
				DOMInjector.getStyleGeneralPage() +
				DOMInjector.getStyleGeneralVideoViewerPage() +
				DOMInjector.getStyleSingleVideoViewerPage()
			);
		}

	}

	//home page
	else /*if (location.pathname === '/')*/{
		console.log('Loading: home page');
		DOMInjector.setStyle(
			DOMInjector.getStyleGeneralPage() +
			DOMInjector.getStyleHomePage()
		);
	}
}


// ============================================================================
// class for injecting elements into the DOM
// ============================================================================

const DOMInjector = new class {

	constructor (){
		this.eHead = null;
		this.eBody = null;

		this.eSecurity = null;
		this.eStyleSecurity = null;
		this.eStylePuzzle   = null;
	}

	init (){

		this.eHead = document.getElementsByTagName("head")[0];
		this.eBody = document.getElementsByTagName("body")[0];

		// style

		this.eStylePuzzle = document.createElement('style');
		this.eStylePuzzle.type = 'text/css';
		this.eStylePuzzle.id = "WOYNERT1";

		this.eStyleSecurity = document.createElement('style');
		this.eStyleSecurity.type = 'text/css';
		this.eStyleSecurity.id = "WOYNERT2";

		this.eHead.appendChild(this.eStylePuzzle);
		this.eHead.appendChild(this.eStyleSecurity);
		this.eHead.id = "WOYNERT3";

		// body

		this.eSecurity = document.createElement('div');
		this.eBody.appendChild(this.eSecurity);

	}

	setup_puzzle(){

		this.eStylePuzzle.innerHTML = (`
		.puzzle__root * {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		.unselectable {
			-webkit-touch-callout: none;
			-webkit-user-select: none;
			-khtml-user-select: none;
			-moz-user-select: none;
			-ms-user-select: none;
			user-select: none;
		}

		/* puzzle */

		.puzzle__fullscreen{
			visibility: hidden;
			width: 100%;
			height: 100%;
			position: fixed;
			top: 0;
			left: 0;
			background-color: #000000cc;

			display: flex;
			justify-content: center;
			z-index: 8100;
		}

		.puzzleCenter{
			width: 400px;
			height: 100%;
		}

		.puzzle{
			background-color: #dbdbdb;
			width: 100%;
			height: auto;
			min-height: 100px;
			position: relative;
			top: 40%;
			padding: 10px;
			border-radius: 2px;
		}

		.puzzle__label{
			text-align: center;
			font-size: 17px;
		}

		.puzzle__input{
			width: 100%;
			max-width: 100%;
			min-width: 100%;
			resize: none;
			background-color: white;
			border-style: solid;
			border-color: #fdfdfd00;
			border-radius: 2px;
			display: block;
			font-size: 13px;
		}

		.puzzle__buttonsContainer{
			width: 100%;
			position: relative;
		}

		.puzzle__button{
			padding: 4px;
			margin-left: auto;
			position: relative;
		}

		.puzzle__button-left{
		}

		.puzzle__button-right{
			visibility: hidden;
			position: absolute;
			right: 0;
		}

		.mark-good{
			background-color: transparent;
			color: green;
		}

		.mark-bad{
			background-color: #ea0a0a17;
			color: #ac0808;
		}

		/*security button toggle*/

		.securityButton__container{
			background-color: #0000000f;
			position: fixed;
			left: 60px;
			top: 9px;
			z-index: 8000;
			width: fit-content;
			height: fit-content;
			padding: 4px;
		}

		.securityButton{
			background-color: #44636f;
			width: 100%;
			height: 100%;
			padding: 4px;
			color: white;
			cursor: pointer;
			font-size: 16px;
		}

		.securityButton-unlocked{
			-webkit-animation:securityButton-unlocked-animation 2s infinite;
		}

		@-webkit-keyframes securityButton-unlocked-animation {
			0%   { background-color: #44636f; }
			50%  { background-color: #44636f; }
			51%  { background-color: #A60B0B; }
			100% { background-color: #A60B0B; }
		}
		`);

		// elements

		this.eSecurity.innerHTML = (`
		<div class="puzzle__root">
			<div id="puzzleFullscreen" class="puzzle__fullscreen">

				<div class="puzzleCenter">
					<div class="puzzle">
						<p id="puzzleLabel" class="puzzle__label"></p>
						<br>

						<textarea
							id="puzzleInput"
							class="puzzle__input"
							autocorrect=off
							onselectstart="return false"
							onpaste="return false;"
							onCopy="return false"
							onCut="return false"
							onDrag="return false"
							onDrop="return false"
							autocomplete=off

							></textarea>
						<br>
						<div class="puzzle__buttonsContainer">
							<button
								id="puzzleButtonBack"
								class="puzzle__button puzzle__button-left"
								>
								✔️ Retroceder</button>
							<button
								id="puzzleButtonNext"
								class="puzzle__button puzzle__button-right"
								>
								Aprovecharé el tiempo por mi familia</button>
						</div>
					</div>
					<div class="timeleft">
					</div>
				</div>

			</div>

			<!--activate button-->
			<div class="securityButton__container">
				<div id="securityButtonToggle" class="securityButton unselectable">
					Ver video
				</div>
			</div>
		</div>
		`);
	}

	getStyleGeneralPage(){
		let styles = "";

		// upload video and youtube apps
		//styles += ' #end #buttons .style-scope.ytd-masthead.style-default { display:none !important; }';

		// notifications
		styles += ' ytd-notification-topbar-button-renderer.ytd-masthead { display:none !important; }';

		//voice search
		styles += ' div#center #voice-search-button { display:none !important; }';

		// message
		styles += ' #lbl_mymessage {font-size: 1.5em;text-align: center;padding-top: 20px;}';

    // gray scale images
    styles += ' img { -webkit-filter: grayscale(90%); filter: grayscale(90%); }';

    // reformat titles text
    styles += `
    #video-title, #title { text-transform: lowercase !important; }
    a {text-transform: initial !important;}
    input {text-transform: initial !important;}
    `;

    // hide from the search results "latest from youtuber", "you've seen before", "people have also seen", also shorts
    styles += ' ytd-shelf-renderer, ytd-reel-shelf-renderer, ytd-radio-renderer { display: none !important; }';

    // separate videos
    styles += ' ytd-video-renderer, ytd-playlist-renderer { margin-bottom: 20em !important;}';

		return styles;
	}

	getStyleGeneralVideoViewerPage(){

		return (`

  /*comentarios*/
  #primary-inner #comments { display:none !important; }
  #comment-teaser { display:none !important; }

  /*minirreproductor*/
  .ytp-right-controls .ytp-miniplayer-button  { display:none !important; }

  /*channel icon in reproductor*/
  div#movie_player .ytp-player-content { display:none !important; }

  /*recommendation video tiles at end*/
  div#movie_player .html5-endscreen.ytp-player-content { display:none !important; }

  /*show list of videos*/
  /*recommended videos */
  div#secondary-inner #related.style-scope { display:none !important; }

  /* related videos mobile mode*/
  #related { display:none !important; }

  /*suggested user content at the end*/
  .ytp-ce-element { display:none !important; }

  /*hide video player*/
  #player-theater-container { max-height: 100px !important; /*min-height: 100px !important;*/ }
  .html5-video-container > video:first-child { display: none !important; }

  /* always show control*/
  .ytp-chrome-bottom { opacity: 100 !important; }

  /* always show control*/
  .ytp-gradient-bottom { display: block !important; height: 22px !important; background: #272727; opacity: 100 !important; background-image: none !important; }

  /* hide live chat */
  iframe#chatframe {
	display: none !important;
  }

  ytd-live-chat-frame#chat{
	height: 100px !important;
	min-height: 0px !important;
  }

  /* shorts that use this song */
  #items > ytd-reel-shelf-renderer { display: none !important; }

  `);

	}

	getStyleSingleVideoViewerPage(){
		let styles = "";

		//hide the entire column
		//styles += ' div#columns #secondary { display:none !important; }';
		return styles;
	}

	getStylePlayListVideoViewerPage(){
		let styles = "";

		return styles;
	}

	getStylePlayListVideoViewerPagerGetIndexes(){
		let styles = "";

		//get numbers
		const videoIndexCurr = document.querySelector( ".index-message-wrapper > .index-message > span:nth-child(1)" ).innerHTML;
		const videoIndexMax  = document.querySelector( ".index-message-wrapper > .index-message > span:nth-child(3)" ).innerHTML;

		console.log(videoIndexCurr + " / " + videoIndexMax);

		//hide previous button
		if (videoIndexCurr === 1){
			styles += ' .ytp-left-controls .ytp-next-button { display:block; }';
			styles += ' .ytp-left-controls .ytp-prev-button { display:none !important; }';
		}

		//hide next button
		else if (videoIndexCurr === videoIndexMax){
			styles += ' .ytp-left-controls .ytp-next-button { display:none !important; }';
			styles += ' .ytp-left-controls .ytp-prev-button { display:block; }';
		}

		this.appendStyle(styles);
	}

	getStyleHomePage(){
		let styles = "";
		//botones de secciones
		//explorar
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items > ytd-guide-entry-renderer:nth-child(2) { display:none !important; }';

		//suscripciones
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items > ytd-guide-entry-renderer:nth-child(3) { display:none !important; }';

		//biblioteca
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items ytd-guide-collapsible-section-entry-renderer #header { display:none !important; }';

		//historial
		//styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items ytd-guide-collapsible-section-entry-renderer #section-items > ytd-guide-entry-renderer:nth-child(1) { display:none !important; }';

		//tus videos
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items ytd-guide-collapsible-section-entry-renderer #section-items > ytd-guide-entry-renderer:nth-child(2) { display:none !important; }';

		//ver mas tarde
		//styles += ' #sections ytd-guide-section-renderer:nth-of-type(1) div#items ytd-guide-collapsible-section-entry-renderer #section-items > ytd-guide-entry-renderer:nth-child(3) { display:none !important; }';

		//canales suscritos
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(2) { display:none !important; }';

		//mas de youtube
		styles += ' #sections ytd-guide-section-renderer:nth-of-type(3), #sections ytd-guide-section-renderer:nth-of-type(4) { display:none !important; }';

		//Terminos y condiciones
		styles += ' ytd-guide-renderer > #footer { display:none !important; }';

		//Videos recomendados
		styles += 'div#primary > ytd-rich-grid-renderer.ytd-two-column-browse-results-renderer { display:none !important; }';

		return styles;
	}

	getStyleRecomendedVideosRecopilation(){
		let styles = "";

		//homepage explore/recommended
		styles += 'div#primary > ytd-rich-grid-renderer.ytd-two-column-browse-results-renderer { display:none !important; }';

		//recommendation video tiles at end
		styles += ' div#movie_player .html5-endscreen.ytp-player-content { display:none !important; }';

		//right list of recommended videos
		styles += ' div#secondary-inner #related.style-scope { display:none !important; }';

		// related videos mobile mode
		styles += ' #related { display:none !important; }';

		//suggested user content at the end
		styles += '.ytp-ce-element { display:none !important; }';

		return styles;
	}

	setStyleEmpty(){
		this.setStyle("");
	}

	// replace style
	setStyle(styles){
		this.eStyleSecurity.innerHTML = styles;
	}

	// add style
	appendStyle(styles){
		this.eStyleSecurity.innerHTML += styles;
	}


}();



// ============================================================================
// QUOTES COLLECTION
//
// Extracted from:
//
// https://github.com/Sanan4li/success-motivational-quotes
// https://github.com/davr59/spanish-quotes/blob/main/data/quotes.json
// https://gist.github.com/AndresReyesDev/e6e73720b8f9ce8784ca8764020a5201
// ============================================================================

phrases = []
phrases = phrases.concat([
  "Life is like riding a bicycle. To keep your balance you must keep moving.",
  "The important thing is not to stop questioning. Curiosity has its own reason for existing.",
  "No problem can be solved from the same level of consciousness that created it.",
  "Try not to become a man of success, but rather try to become a man of value.",
  "I try to learn from the past, but I plan for the future by focusing exclusively on the present. That's where the fun is.",
  "The point is that you can't be too greedy.",
  "My father taught me to work; he did not teach me to love it.",
  "Common looking people are the best in the world: that is the reason the Lord makes so many of them.",
  "How many legs does a dog have if you call the tail a leg? Four. Calling a tail a leg doesn't make it a leg.",
  "And in the end it's not the years in your life that count. It's the life in your years.",
  "My experience has taught me that a man who has no vices has damned few virtues.",
  "Will springs from the two elements of moral sense and self-interest.",
  "I am a slow walker, but I never walk backwards.",
  "I will prepare and some day my chance will come.",
  "I never had a policy; I have just tried to do my very best each and every day.",
  "If there is anything that a man can do well, I say let him do it. Give him a chance.",
  "You cannot escape the responsibility of tomorrow by evading it today.",
  "Nearly all men can stand adversity, but if you want to test a man's character, give him power.",
  "I do not think much of a man who is not wiser today than he was yesterday.",
  "People are just as happy as they make up their minds to be.",
  "Imagination is more important than knowledge.",
  "The hardest thing in the world to understand is the income tax.",
  "Reality is merely an illusion, albeit a very persistent one.",
  "The only real valuable thing is intuition.",
  "A person starts to live when he can live outside himself.",
  "Weakness of attitude becomes weakness of character.",
  "I never think of the future. It comes soon enough.",
  "The eternal mystery of the world is its comprehensibility.",
  "Sometimes one pays most for the things one gets for nothing.",
  "Science without religion is lame. Religion without science is blind.",
  "Anyone who has never made a mistake has never tried anything new.",
  "Great spirits have often encountered violent opposition from weak minds.",
  "Common sense is the collection of prejudices acquired by age eighteen.",
  "Science is a wonderful thing if one does not have to earn one's living at it.",
  "The secret to creativity is knowing how to hide your sources.",
  "The only thing that interferes with my learning is my education.",
  "God does not care about our mathematical difficulties. He integrates empirically.",
  "The whole of science is nothing more than a refinement of everyday thinking.",
  "Technological progress is like an axe in the hands of a pathological criminal.",
  "Peace cannot be kept by force. It can only be achieved by understanding.",
  "The most incomprehensible thing about the world is that it is comprehensible.",
  "Education is what remains after one has forgotten everything he learned in school.",
  "Do not worry about your difficulties in Mathematics. I can assure you mine are still greater.",
  "Equations are more important to me, because politics is for the present, but an equation is something for eternity.",
  "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
  "As far as the laws of mathematics refer to reality, they are not certain, as far as they are certain, they do not refer to reality.",
  "The fear of death is the most unjustified of all fears, for there's no risk of accident for someone who's dead.",
  "In order to form an immaculate member of a flock of sheep one must, above all, be a sheep.",
  "A real decision is measured by the fact that you've taken a new action. If there's no action, you haven't truly decided.",
  "Commit to CANI! - Constant And Never-ending Improvement.",
  "For changes to be of any true value, they've got to be lasting and consistent.",
  "If you do what you've always done, you'll get what you've always gotten.",
  "In life you need either inspiration or desperation.",
  "It is in your moments of decision that your destiny is shaped.",
  "It is not what we get. But who we become, what we contribute... that gives meaning to our lives.",
  "It not knowing what to do, it's doing what you know.",
  "It's not the events of our lives that shape us, but our beliefs as to what those events mean.",
  "Passion is the genesis of genius.",
  "People are not lazy. They simply have impotent goals - that is, goals that do not inspire them.",
  "Setting goals is the first step in turning the invisible into the visible.",
  "The meeting of preparation with opportunity generates the offspring we call luck.",
  "The path to success is to take massive, determined action.",
  "The way we communicate with others and with ourselves ultimately determines the quality of our lives.",
  "There is no such thing as failure. There are only results.",
  "There's always a way - if you're committed.",
  "There's no abiding success without commitment.",
  "We aren't in an information age, we are in an entertainment age.",
  "We can change our lives. We can do, have, and be exactly what we wish.",
  "We will act consistently with our view of who we truly are, whether that view is accurate or not.",
  "Whatever happens, take responsibility!",
  "You always succeed in producing a result.",
  "The more credit you give away, the more will come back to you. The more you help others, the more they will want to help you.",
  "It doesn't matter where you are coming from. All that matters is where you are going.",
  "Relationships are the hallmark of the mature person.",
  "Never say anything about yourself you do not want to come true.",
  "The person we believe ourselves to be will always act in a manner consistent with our self-image.",
  "We feel good about ourselves to the exact degree we feel in control of our lives.",
  "You have within you right now, everything you need to deal with whatever the world can throw at you.",
  "Any fool can criticize, condemn, and complain -- and most fools do.",
  "Remember happiness doesn't depend on who you are or what you have; it depends solely upon what you think.",
  "Success is getting what you want. Happiness is wanting what you get.",
  "Those convinced against their will are of the same opinion still.",
  "I deal with the obvious. I present, reiterate and glorify the obvious -- because the obvious is what people need to be told.",
  "The royal road to a man's heart is to talk to him about the things he treasures most.",
  "If you want to be enthusiastic, act enthusiastic.",
  "When fate hands us a lemon, let's try to make a lemonade.",
  "The successful man will profit from his mistakes and try again in a different way.",
  "Flaming enthusiasm, backed up by horse sense and persistence, is the quality that most frequently makes for success.",
  "Mistakes are painful when they happen, but years later a collection of mistakes is what is called experience.",
  "Expect the best, plan for the worst, and prepare to be surprised.",
  "You must learn from your past mistakes, but not lean on your past successes.",
  "It's not what you are that holds you back, it's what you think you are not.",
  "Luck happens when opportunity encounters the prepared mind.",
  "Losers make promises they often break. Winners make commitments they always keep.",
  "Life is not accountable to us. We are accountable to life.",
  "We have got to have a dream if we are going to make a dream come true.",
  "Out of need springs desire, and out of desire springs the energy and the will to win.",
  "Love is a daily, mutual exchange of value.",
  "A smile is the light in your window that tells others that there is a caring, sharing person inside.",
  "The greatest gifts you can give your children are the roots of responsibility and the wings of independence.",
  "A little more moderation would be good. Of course, my life hasn't exactly been one of moderation.",
  "Sometimes by losing a battle you find a new way to win the war.",
  "You have to think anyway, so why not think big?",
  "Money was never a big motivation for me, except as a way to keep score. The real excitement is playing the game.",
  "No dream is too big. No challenge is too great. Nothing we want for our future is beyond our reach.",
  "I've always won, and I'm going to continue to win. And that's the way it is.",
  "I like thinking big. If you're going to be thinking anything, you might as well think big.",
  "Our attitude toward life determines life's attitude towards us.",
  "People with goals succeed because they know where they're going.",
  "Success is the progressive realization of a worthy goal or ideal.",
  "Open your ears before you open your mouth, it may surprise your eyes!",
  "Your world is a living expression of how you are using and have used your mind.",
  "We can let circumstances rule us, or we can take charge and rule our lives from within.",
  "We can help others in the world more by making the most of yourself than in any other way.",
  "Whenever we're afraid, its because we don't know enough. If we understood enough, we would never be afraid.",
  "Whatever we plant in our subconscious mind and nourish with repetition and emotion will one day become a reality.",
  "We tend to live up to our expectations.",
  "You'll find boredom where there is an absence of a good idea.",
  "Creativity is a natural extension of our enthusiasm.",
  "Everything in the world we want to do or get done, we must do with and through people.",
  "Our first journey is to find that special place for us.",
  "For every disciplined effort there is a multiple reward.",
  "Formal education will make you a living; self-education will make you a fortune.",
  "Give whatever you are doing and whoever you are with the gift of your attention.",
  "Words do two major things: They provide food for the mind and create light for understanding and awareness.",
  "Discipline is the bridge between goals and accomplishment.",
  "Success is nothing more than a few simple disciplines, practiced every day.",
  "Success is not to be pursued; it is to be attracted by the person you become.",
  "Either you run the day or the day runs you.",
  "Whatever good things we build end up building us.",
  "We must all suffer one of two things: the pain of discipline or the pain of regret or disappointment.",
  "Take care of your body. It's the only place you have to live.",
  "Don't wish it were easier, wish you were better.",
  "Don't say, \"If I could, I would.\" Say, \"If I can, I will\"",
  "Indecision is the thief of opportunity.",
  "You cannot change your destination overnight, but you can change your direction overnight.",
  "Ideas attract money, time, talents, skills, energy and other complementary ideas that will bring them into reality.",
  "I never let my subject get in the way of what I want to talk about.",
  "I want to talk with people who care about things that matter that will make a life- changing difference.",
  "In imagination, there's no limitation.",
  "When your self-worth goes up, your net worth goes up with it.",
  "Imitate until you emulate; match and surpass those who launched you. It's the highest form of thankfulness.",
  "Your belief determines your action and your action determines your results, but first you have to believe.",
  "The more goals you set - the more goals you get.",
  "With vision, every person, organization and country can flourish. The Bible says, 'Without vision we perish.",
  "Predetermine the objectives you want to accomplish. Think big, act big and set out to accomplish big results.",
  "The best job goes to the person who can get it done without passing the buck or coming back with excuses.",
  "It is always your next move.",
  "No one can make you jealous, angry, vengeful, or greedy -- unless you let him.",
  "Everyone enjoys doing the kind of work for which he is best suited.",
  "The most common cause of fear of old age is associated with the possibility of poverty.",
  "There is always room for those who can be relied upon to deliver the goods when they say they will.",
  "Just as our eyes need light in order to see, our minds need ideas in order to conceive.",
  "Money without brains is always dangerous.",
  "War grows out of the desire of the individual to gain advantage at the expense of his fellow men.",
  "Persistence is to the character of man as carbon is to steel.",
  "Don't wait. The time will never be just right.",
  "The ladder of success is never crowded at the top.",
  "All great truths are simple in final analysis, and easily understood; if they are not, they are not great truths.",
  "If you cannot do great things, do small things in a great way.",
  "No man can succeed in a line of endeavor which he does not like.",
  "The most interesting thing about a postage stamp is the persistence with which it sticks to its job.",
  "It is literally true that you can succeed best and quickest by helping others to succeed.",
  "You might well remember that nothing can bring you success but yourself.",
  "Indecision is the seedling of fear.",
  "Big pay and little responsibility are circumstances seldom found together.",
  "Empty pockets never held anyone back. Only empty heads and empty hearts can do that.",
  "Live your life and forget your age.",
  "First thing every morning before you arise say out loud, \"I believe,\" three times.",
  "There is a real magic in enthusiasm. It spells the difference between mediocrity and accomplishment.",
  "Stand up to your obstacles and do something about them. You will find that they haven't half the strength you think they have.",
  "We struggle with the complexities and avoid the simplicities.",
  "Never talk defeat. Use words like hope, belief, faith, victory.",
  "Practice hope. As hopefulness becomes a habit, you can achieve a permanently happy spirit.",
  "If you want to get somewhere you have to know where you want to go and how to get there. Then never, never, never give up.",
  "In every difficult situation is potential value. Believe this, then begin looking for it.",
  "The more you lose yourself in something bigger than yourself, the more energy you will have.",
  "Understanding can overcome any situation, however mysterious or insurmountable it may appear to be.",
  "The mind, ever the willing servant, will respond to boldness, for boldness, in effect, is a command to deliver mental resources.",
  "Enthusiasm releases the drive to carry you over obstacles and adds significance to all you do.",
  "It's always too soon to quit!",
  "Cushion the painful effects of hard blows by keeping the enthusiasm going strong, even if doing so requires struggle.",
  "Life's blows cannot break a person whose spirit is warmed at the fire of enthusiasm.",
  "You can be greater than anything that can happen to you.",
  "Go forward confidently, energetically attacking problems, expecting favorable outcomes.",
  "Believe it is possible to solve your problem. Tremendous things happen to the believer. So believe the answer will come. It will.",
  "When you are afraid, do the thing you are afraid of and soon you will lose your fear of it.",
  "The more you venture to live greatly, the more you will find within you what it takes to get on top of things and stay there.",
  "If you want things to be different, perhaps the answer is to become different yourself.",
  "Believe that you are bigger than your difficulties, for you are, indeed.",
  "Be aware when the great God lets loose a thinker on this planet.",
  "Character is higher than intellect... A great soul will be strong to live, as well as to think.",
  "Do not be too timid and squeamish about your actions. All life is an experiment.",
  "Do not go where the path may lead, go instead where there is no path and leave a trail.",
  "I awoke this morning with devout thanksgiving for my friends, the old and the new.",
  "If I have lost confidence in myself, I have the universe against me.",
  "Insist on yourself; never imitate... Every great man is unique.",
  "Let not a man guard his dignity, but let his dignity guard him.",
  "Nothing can bring you peace but yourself.",
  "The only way to have a friend is to be one.",
  "Trust men and they will be true to you; treat them greatly, and they will show themselves great.",
  "The best effect of fine persons is felt after we have left their presence.",
  "Every artist was first an amateur.",
  "The reward of a thing well done is to have done it.",
  "Yes, you can be a dreamer and a doer too, if you will remove one word from your vocabulary: impossible.",
  "You can often measure a person by the size of his dream.",
  "Build a dream and the dream will build you.",
  "Always look at what you have left. Never look at what you have lost.",
  "If you listen to your fears, you will die never knowing what a great person you might have been.",
  "Impossible situations can become possible miracles.",
  "Let your imagination release your imprisoned possibilities.",
  "Anyone can count the seeds in an apple, but only God can count the number of apples in a seed.",
  "Most people who succeed n the face of seemingly impossible conditions are people who simply don't know how to quit.",
  "Life is but a moment, death also is but another.",
  "Better to do something imperfectly than to do nothing flawlessly.",
  "What great thing would you attempt if you knew you could not fail?",
  "The only place where your dream becomes impossible is in your own thinking.",
  "Never cut a tree down in the wintertime. Never make a negative decision in the low time.",
  "Problems are not stop signs, they are guidelines.",
  "Let your hopes, not your hurts, shape your future.",
  "Always look at what you have left. Never look at what you have lost.",
  "Failure defeats losers, failure inspires winners.",
  "Your most expensive advice is the free advice you receive from your financially struggling friends and relatives.",
  "Average investors are on the outside trying to look into the inside of the company or property they are investing in.",
  "It's the investor who is risky, not the investment.",
  "The idea of working all your life, saving, and putting money into a retirement account is a very slow plan.",
  "If you don't first handle fear and desire, and you get rich, you'll be a high pay slave.",
  "To gain more abundance a person needs more skills and needs to be more creative and cooperative.",
  "The unique ability to take decisive action while maintaining focus on the ultimate mission is what defines a true leader.",
  "By asking the question \"How can I afford it?\" your brain is put to work.",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work.",
  "My main purpose in life is to make money so I can afford to go on creating more inventions.",
  "My principal business is giving commercial value to the brilliant - but misdirected ideas of others.",
  "I am quite correctly described as 'more of a sponge than an inventor.",
  "A good idea is never lost. Even though its originator or possessor may die, it will someday be reborn in the mind of another.",
  "If we all did the things we are really capable of doing, we would literally astound ourselves.",
  "I have far more respect for the person with a single idea who gets there than for the person with a thousand ideas who does nothing.",
  "Many of life's failures are experienced by people who did not realize how close they were to success when they gave up.",
  "Sometimes, all you need to invent something is a good imagination and a pile of junk.",
  "The thing I lose patience with the most is the clock. Its hands move too fast.",
  "Time is really the only capital that any human being has and the thing that he can least afford to waste or lose.",
  "Whatever the mind of man creates, should be controlled by man's character.",
  "Someday, man will harness the rise and fall of the tides, imprison the power of the sun, and release atomic power.",
  "Until man duplicates a blade of grass, nature can laugh at his so-called scientific knowledge.",
  "I believe that the science of chemistry alone almost proves the existence of an intelligent creator.",
  "If parents pass enthusiasm along to their children, they will leave them an estate of incalculable value.",
  "Life's most soothing things are a child's goodnight and sweet music.",
  "I believe that every human mind feels pleasure in doing good to another.",
  "The most valuable of all talents is that of never using two words when one will do.",
  "Friendship is precious, not only in the shade, but in the sunshine of life.",
  "It is my principle that the will of the majority should always prevail.",
  "When a man assumes a public trust, he should consider himself as public property.",
  "The man who fears no truths has nothing to fear from lies.",
  "A coward is much more exposed to quarrels than a man of spirit.",
  "I'm a great believer in luck, and I find the harder I work the more I have of it.",
  "Never spend your money before you have it.",
  "Never trouble another for what you can do for yourself.",
  "Nothing gives one person so much advantage over another as to remain always cool and unruffled under all circumstances.",
  "Walking is the best possible exercise. Habituate yourself to walk very far.",
  "Aim for the moon. If you miss, you may hit a star.",
  "Be careful the environment you choose for it will shape you; be careful the friends you choose for you will become like them.",
  "If there is something to gain and nothing to lose by asking, by all means ask!",
  "Self-suggestion makes you master of yourself.",
  "Tell everyone what you want to do and someone will want to help you do it.",
  "Thinking will not overcome fear but action will.",
  "Truth will always be truth, regardless of lack of understanding, disbelief or ignorance.",
  "When we direct our thoughts properly, we can control our emotions.",
  "You affect your subconscious mind by verbal repetition.",
  "Definiteness of purpose is the starting point of all achievement",
  "Success is achieved and maintained by those who try and keep trying.",
  "You are the only person on earth who can use your ability.",
  "When you put faith, hope and love together, you can raise positive kids in a negative world.",
  "There has never been a statue erected to honor a critic.",
  "Failure is a detour, not a dead-end street.",
  "What you get by achieving your goals is not as important as what you become by achieving your goals.",
  "Happiness is not pleasure, it is victory.",
  "Every sale has five basic obstacles: no need, no money, no hurry, no desire, no trust.",
  "It's not what you've got, it's what you use that makes a difference.",
  "Success is the maximum utilization of the ability that you have.",
  "Winning is not everything, but the effort to win is.",
  "Efficiency is doing things right. Effectiveness is doing the right thing.",
  "The person who will not stand for something will fall for anything.",
  "It's your attitude not your aptitude that determines your altitude.",
  "You do not pay the price of success, you enjoy the price of success.",
  "All resources are not obvious; great managers find and develop available talent.",
  "A goal properly set is halfway reached.",
  "Positive thinking will let you do everything better than negative thinking will.",
  "You do not have to be great to start, but you have to start to be great.",
  "You may be disappointed if you fail, but you are doomed if you never try.",
  "Anything you can do needs to be done, so pick up the tool of your choice and get started.",
  "He who is outside the door has already a good part of his journey behind him.",
  "Vision without action is merely a dream. Action without vision just passes the time. Vision with action can change the world.",
  "Learning new things won't help the person who isn\'t using what he already knows.",
  "No one knows what he can do until he tries.",
  "The great aim of education is not knowledge, but action.",
  "It\'s not what you know that makes the difference. It\'s what you DO with what you know that makes the difference.",
  "You will get no more out of life than you put into it.",
  "What one does is what counts. Not what one had the intention of doing.",
  "Action will remove the doubt that theory can\'t solve.",
  "Often greater risk is involved in postponement than in making a wrong decision.",
  "You can\'t \'try\' to do things; you simply must DO them.",
  "Jump into the middle of things, get your hands dirty, fall flat on your face, and then reach for the stars.",
  "A wise man will make more opportunities than he finds.",
  "Your actions, and your action alone, determines your worth.",
  "The way to get ahead is to start now.",
  "Nothing will kill a deal like time.",
  "Move them forward, or move them out.",
  "Adversity is an experience, not a final act.",
  "If you don\'t fail now and again, it\'s a sign you\'re playing it safe.",
  "If you don\'t fail now and again, it\'s a sign you\'re playing it safe.",
  "Failure is an event, never a person.",
  "Experience is not what happens to you. Experience is what you do with what happens to you.",
  "Success is getting up one more time than you fall down.",
  "We must accept finite disappointment, but we must never lose infinite hope.",
  "If you want to increase your success rate, double your failure rate.",
  "Bad times have a scientific value. These are occasions a good learner would not miss.",
  "There are two ways of meeting difficulties: you alter the difficulties or you alter yourself meeting them.",
  "The crisis of today is the joke of tomorrow.",
  "Success is going from failure to failure without a loss of enthusiasm.",
  "While one person hesitates because he feels inferior, the other is busy making mistakes and becoming superior.",
  "We are often more frightened than hurt; and we suffer more from imagination than from reality.",
  "People are known as much for the quality of their failures as the quality of the successes.",
  "In every difficult situation is potential value. Believe this, then begin looking for it.",
  "Life is 10% what happens to you and 90% how you react to it.",
  "It may not be your fault for being down, but it\'s got to be your fault for not getting up.",
  "Pain is inevitable. Suffering is optional.",
  "Worry is like a rocking chair; you expend a lot of energy and never get anywhere.",
  "I can\'t say I was ever lost, but I was bewildered once for three days.",
  "Of all the things you wear, your expression is the most important.",
  "Attitudes are more important than facts.",
  "Outlook determines outcome; attitude determines action.",
  "It is easier to act yourself into feeling, than to feel yourself into acting.",
  "If you think you can or you can\'t, you\'re always right.",
  "If you want to change attitudes, start with a change in behavior.",
  "Enthusiasm is the greatest asset in the world. It beats money, power, and influence.",
  "A man can succeed at almost anything for which he has unlimited enthusiasm.",
  "Once you say you\'re going to settle for second, that\'s what happens to you.",
  "Nothing great was ever achieved without enthusiasm.",
  "Life is a mirror and will reflect back to the thinker what he thinks into it.",
  "What we see depends mainly on what we look for.",
  "If you must doubt anything, doubt your perceived limitations.",
  "All the technology in the world will never replace a positive attitude.",
  "Dreams are powerful reflections of your actual growth potential.",
  "Great minds have purposes, others have wishes.",
  "If you have the will to win, you have achieved half your success; if you don\'t, you have achieved half your failure.",
  "Life is a great big canvas, and you should throw all the paint on it you can.",
  "Wealth is largely the result of habit.",
  "We would accomplish many more things if we did not think of them as impossible.",
  "You must have long term goals to keep you from being frustrated by short term failures.",
  "Nothing is as necessary for success as the single-minded pursuit of an objective.",
  "More people fail because of lack of purpose than do because of a lack of talent.",
  "Success in sales, and life, is a series of tiny victories.",
  "Don\'t make your goals too easy; you\'ll be cheating yourself.",
  "When you reach for the stars, you may not quite get one, but you won\'t come up with a handful of mud, either.",
  "If you\'re surprised by what you achieve, you\'re not setting your goals high enough.",
  "To continue learning is to embrace the process of trial and error at higher and higher levels.",
  "Real ongoing lifelong education doesn\'t answer questions, it provokes them.",
  "An investment in knowledge pays the best interest.",
  "No man really becomes a fool until he stops asking questions.",
  "Forget the times of your distress, but never forget what they taught you.",
  "A fact may be the smallest unit of information, but a story is the smallest unit of meaning.",
  "Learn as if you were going to live forever. Live as if you were going to die tomorrow.",
  "To be happy, drop the words \'if only\' and substitute instead the words \'next time\'.",
  "What we actually learn, from any given set of circumstances, determines whether we become increasingly powerless or more powerful.",
  "Effort only fully releases its reward after a person refuses to quit.",
  "The person who wins may have been counted out several times, but he didn\'t hear the referee.",
  "Life is a grindstone. But whether it grinds us down or polishes us up depends on us.",
  "The thing we call \'failure\' is not falling down, but staying down.",
  "If you are doing your best, you will not have time to worry about failure.",
  "Everyone who got where he is had to begin where he was.",
  "Only those who have the patience to do simple things perfectly will acquire the skill to do difficult things easily.",
  "We can learn to soar only in direct proportion to our determination to rise above the doubt and transcend the limitations.",
  "To be prepared is to have no anxiety.",
  "Chance favors the prepared mind.",
  "In all things, success depends upon previous preparation, and without such preparation, there is failure.",
  "I skate to where the puck is going to be, not where it has been.",
  "Your future depends on many things, but mostly on you.",
  "My whole life is waiting for the questions to which I have prepared answers.",
  "Unless you try to do something beyond what you have already mastered, you will never grow.",
  "A ship in port is safe, but that\'s not what ships are built for.",
  "If you\'re never scared, embarrassed, or hurt, it means you never take any chances.",
  "Only those who risk going too far can possibly find out how far one can go.",
  "Why not go out on a limb. Isn\'t that where the fruit is?",
  "Progress always involves risk. You can\'t steal second base with your foot on first.",
  "If you limit your actions to things that nobody can possibly find fault with, you will not do much.",
  "There\'s as much risk in doing nothing as in doing something.",
  "Too many people are thinking of security rather than opportunity.",
  "People who take risks are the people you\'ll lose against.",
  "The person who makes no mistakes does not usually make anything.",
  "The only failure which lacks dignity is the failure to try.",
  "Life is either a daring adventure or nothing at all.",
  "I think we should follow one simple rule: If we can take the worst, take the risk.",
  "The greatest mistake you can make is to be continually fearing you will make one.",
  "Use action to cure fear and gain confidence. Do what you fear and fear disappears. Just try it and see.",
  "What would you attempt to do if you knew you could not fail?",
  "Much good work is lost for the lack of a little more.",
  "The more I want to get something done, the less I call it work.",
  "The world is full of willing people. Some willing to work, the others willing to let them.",
  "You may have the loftiest goals, the highest ideals, the noblest dreams, but remember this, nothing works unless you do.",
  "Even if you are on the right track, you will get run over if you just sit there.",
  "There are no shortcuts to any place worth going.",
  "He who is afraid of doing too much always does too little.",
  "Unless a man undertakes more than he possibly can do, he will never do all he can do.",
  "When we do more than we are paid to do, eventually we will be paid more for what we do.",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work.",
  "The best preparation for good work tomorrow is good work today.",
  "People forget how fast you did a job, but they remember how well you did it.",
  "The secret of success is to do common things uncommonly well.",
  "To be a leader, you must stand for something, or fall for anything.",
  "The fastest way to pass your own expectation is to add passion to your labor.",
  "Charity is injurious unless it helps the recipient to become independent of it.",
  "You miss 100% of the shots you don't take.",
  "Accept the past for what it was. Acknowledge the present for what it is. Anticipate the future for what it can become. ",
  "I always tried to turn every disaster into an opportunity. ",
  "Sometimes things become possible if we want them bad enough.",
  "To accomplish great things, we must not only act, but also dream, not only plan, but also believe.",
  "To be a champion, you have to believe in yourself when nobody else will.",
  "If we are to achieve results never before accomplished, we must expect to employ methods never before attempted.",
  "Trust in yourself. Your perceptions are often far more accurate than you are willing to believe.",
  "Motivation is like food for the brain. You cannot get enough in one sitting. It needs continual and regular refills.",
  "You may be disappointed if you fail, but you are doomed if you do not try.",
  "I have failed over and over again. That is why I succeed.",
  "Never stop learning. If you learn one new thing everyday, you will overcome 99% of your competition.",
  "It's a funny thing about life; if you refuse to accept anything but the best, you often get it.",
  "Believe in yourself and you will be unstoppable.",
  "No man ever became great without many and great mistakes.",
  "n the long run, we only hit what we aim at.",
  "Success seems to be connected with action. Successful men keep moving; they make mistakes, but they do not quit.",
  "Destiny is not a matter of chance; it's a matter of choice. It is not a thing to be waited for; it is a thing to be achieved. ",
  "All or our dreams can come true if we have the courage to pursue them. ",
  "If I have the belief that I can do it, I shall surely acquire the capacity to do it even if I may not have the capacity at the beginning.",
  "If you can't do it today, what makes you think you can do it tomorrow.",
  "Our intentions create our reality. ",
  "If you realized how powerful your thoughts are, you would never think another negative thought.",
  "Some men have thousands of reasons why they cannot do what they want to; all they need is one reason why they can. ",
  "Everything you want is on the other side of fear. ",
  "Start by doing what is necessary, then what is possible, and suddenly you are doing the impossible. ",
  "Don\'t compare yourself with anyone in this world...if you do so, you are insulting yourself.",
  "I choose a lazy person to do a hard job. Because a lazy person will find an easy way to do it.",
  "Success is a lousy teacher. It seduces smart people into thinking they can\'t lose.",
  "If you are born poor it\'s not your mistake, but if you die poor it\'s your mistake.",
  "Life is not fair get, used to it!",
  "We make the future sustainable when we invest in the poor, not when we insist on their suffering.",
  "It\'s fine to celebrate success but it is more important to heed the lessons of failure.",
  "We all need people who will give us feedback. That\'s how we improve.",
  "Treatment without prevention is simply unsustainable.",
  "Discrimination has a lot of layers that make it tough for minorities to get a leg up.",
  "As we look ahead into the next century, leaders will be those who empower others.",
  "We\'ve got to put a lot of money into changing behavior.",
  "The general idea of the rich helping the poor, I think, is important.",
  "I believe that if you show people the problems and you show them the solutions they will be moved to act.",
  "Legacy is a stupid thing! I don\'t want a legacy.",
  "Lectures should go from being like the family singing around the piano to high-quality concerts.",
  "Personally, I\'d like to see more of our leaders take a technocratic approach to solving our biggest problems.",
  "We have to find a way to make the aspects of capitalism that serve wealthier people serve poorer people as well.",
  "Expectations are a form of first-class truth: If people believe it, it\'s true.",
  "Money has no utility to me beyond a certain point.",
  "If you think your teacher is tough, wait \'til you get a boss. He doesn\'t have tenure.",
  "Be nice to nerds. Chances are you\'ll end up working for one.",
  "Life is too short for long-term grudges.",
  "The first step is to establish that something is possible. Then probability will occur.",
  "Great companies are built on great products.",
  "If you get up in the morning and think the future is going to be better, it is a bright day. Otherwise, it\'s not.",
  "If you need inspiring words, don\'t do it.",
  "Good ideas are always crazy until they\'re not.",
  "When something is important enough, you do it even if the odds are not in your favor.",
  "If something is important enough, even if the odds are against you, you should still do it.",
  "I think it is possible for ordinary people to choose to be extraordinary.",
  "Don\'t confuse schooling with education. I didn\'t go to Harvard but the people that work for me did.",
  "Rockets are cool. There\'s no getting around that.",
  "Failure is an option here. if things are not failing, you are not innovating.",
  "The first step is to establish that something is possible; then probability will occur.",
  "Your Will is the most accurate way to predict the Future.",
  "Take risks now and do something bold. You won\'t regret it.",
  "Patience is a virtue, and I\'m learning patience. It\'s a tough lesson.",
  "If something is important enough you should try, even if the probable outcome is a failure.",
  "If the rules are such that you can\'t make progress, then you have to fight the rules.",
  "Some people don\'t like change, but you need to embrace change if the alternative is disaster.",
  "You have to be pretty driven to make it happen. Otherwise, you will just make yourself miserable.",
  "I could either watch it happen or be a part of it.",
  "Persistence is very important. You should not give up unless you are forced to give up.",
  "Constantly think about how you could be doing things better and keep questioning yourself.",
  "It\'s ok to have your eggs in one basket as long as you control what happens to that basket.",
  "When I was in college, I wanted to be involved in things that would change the world.",
  "Every time you have to speak, you are auditioning for leadership.",
  "A good leader leads the people from above them. A great leader leads the people from within them.",
  "Don't follow the crowd, let the crowd follow you.",
  "We are what we pretend to be, so we must be careful about what we pretend to be.",
  "Leadership is the art of giving people a platform for spreading ideas that work.",
  "The greatest leader is not necessarily the one who does the greatest things. He is the one that gets the people to do the greatest things.",
  "To add value to others, one must first value others.",
  "The task of the leader is to get their people from where they are to where they have not been.",
  "Treat people as if they were what they ought to be, and you help them become what they are capable of being.",
  "I suppose leadership at one time meant muscles; but today it means getting along with people.",
  "There are no office hours for leaders.",
  "The important thing is this: to be able to give up in any given moment all that we are for what we can become.",
  "The quality of a leader is reflected in the standards they set for themselves.",
  "Do what you feel in your heart to be right, for you'll be criticized anyway.",
  "I cannot give you the formula for success, but I can give you the formula for failure, which is: Try to please everybody.",
  "Becoming a leader is synonymous with becoming yourself. It is precisely that simple and it is also that difficult.",
  "Wisdom is knowing what to do next, skill is knowing how to do it, and virtue is doing it.",
  "Leaders don't inflict pain, they share pain.",
  "The growth and development of people is the highest calling of leadership.",
  "Management is doing things right; leadership is doing the right thing.",
  "The function of leadership is to produce more leaders, not more followers.",
  "Leadership is the capacity to translate vision into reality.",
  "There exist limitless opportunities in every industry. Where there is an open mind, there will always be a frontier.",
  "A leader is a person you will follow to a place you would not go by yourself.",
  "A good leader takes a little more than his share of the blame, a little less than his share of the credit.",
  "Effective leadership is not about making speeches or being liked; leadership is defined by results, not attributes.",
  "A leader is one who knows the way, goes the way, and shows the way.",
  "Leaders think and talk about the solutions. Followers think and talk about the problems.",
  "Leadership is the art of getting someone else to do something you want done because he wants to do it.",
  "The things we fear most in organizations--fluctuations, distubances, imbalances--are the primary sources of creativity.",
  "A leader is best when people barely know he exists. When his work is done, his aim fulfilled, they will say: we did it ourselves.",
  "A leader takes people where they want to go. A great leader takes people where they don't necessarily want to go, but ought to be.",
  "The art of leadership is saying no, not saying yes. It is very easy to say yes.",
  "The price of greatness is responsibility.",
  "Today a reader, tomorrow a leader.",
  "Anyone can hold the helm when the sea is calm.",
  "Become the kind of leader that people would follow voluntarily, even if you had no title or position.",
  "You manage things; you lead people.",
  "Leadership is not about titles, positions, or flowcharts. It is about one life influencing another.",
  "People buy into the leader before they buy into the vision.",
  "Doing what is right isn't the problem. It is knowing what is right.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Do not follow where the path may lead. Go instead where there is no path and leave a trail.",
  "Keep your fears to yourself, but share your courage with others.",
  "There are two ways of spreading light: to be the candle or the mirror that reflects it.",
  "No man will make a great leader who wants to do it all himself, or to get all the credit for doing it.",
  "You take people as far as they will go, not as far as you would like them to go.",
  "Leadership and learning are indispensable to each other.",
  "The role of leadership is to transform the complex situation into small pieces and prioritize them.",
  "Real leadership is leaders recognizing that they serve the people that they lead.",
  "To do great things is difficult; but to command great things is more difficult.",
  "Ninety percent of leadership is the ability to communicate something people want.",
  "Effective leadership is putting first things first. Effective management is discipline, carrying it out.",
  "The task of leadership is not to put greatness into humanity, but to elicit it, for the greatness is already there.",
  "Leadership is the art of getting someone else to do something you want done because he wants to do it.",
  "Leadership cannot really be taught. It can only be learned.",
  "Look over your shoulder now and then to be sure someone's following you.",
  "Innovation distinguishes between a leader and a follower.",
  "Great leaders are not defined by the absence of weakness, but rather by the presence of clear strengths.",
  "Don't be afraid to give up the good to go for the great.",
  "Leadership is unlocking people's potential to become better.",
  "The greatest leaders mobilize others by coalescing people around a shared vision.",
  "The supreme quality of leadership is integrity.",
  "The function of leadership is to produce more leaders, not more followers.",
  "It is better to fail in originality than to succeed in imitation.",
  "The road to success and the road to failure are almost exactly the same.",
  "Success usually comes to those who are too busy to be looking for it.",
  "Opportunities don't happen. You create them.",
  "Don't be afraid to give up the good to go for the great.",
  "I find that the harder I work, the more luck I seem to have.",
  "Never give in except to convictions of honor and good sense.",
  "Stop chasing the money and start chasing the passion.",
  "The ones who are crazy enough to think they can change the world, are the ones that do.",
  "All progress takes place outside the comfort zone.",
  "Don't let the fear of losing be greater than the excitement of winning.",
  "If you really look closely, most overnight successes took a long time.",
  "The way to get started is to quit talking and begin doing.",
  "The successful warrior is the average man, with laser-like focus.",
  "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.",
  "I cannot give you the formula for success, but I can give you the formula for failure--It is: Try to please everybody.",
  "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful.",
  "If you can dream it, you can do it.",
  "A successful man is one who can lay a firm foundation with the bricks that other throw at him.",
  "Intelligence without ambition is like a bird without wings.",
  "Some things have to be believed to be seen.",
  "Wealth is the product of man's ability to think.",
  "We must never be afraid to go too far, for success lies just beyond.",
  "High expectations are the key to everything.",
  "It is what you learn after you know it all that counts.",
  "It is no sin to attempt and fail. The only sin is to not make the attempt.",
  "Dreams are the reality of tomorrow.",
  "If anything is worth trying at all, it's worth trying at least ten times. -",
  "The atmosphere of expectancy is the breeding ground for miracles.",
  "Problems are only opportunities in work clothes.",
  "The best way to escape from a problem is to solve it.",
  "You will become as small as your controlling desire; as great as your dominant aspiration.",
  "Procrastination is opportunities natural assassin.",
  "Nothing is particularly hard if you divide it into small jobs.",
  "You can't build a reputation on what you are going to do.",
  "When I've heard all I need to make a decision, I don't take a vote. I make a decision.",
  "You can't have a better tomorrow if you are thinking about yesterday all the time.",
  "Never complain about what you permit.",
  "Take heed: you do not find what you do not seek.",
  "Our imagination is the only limit to what we can hope to have in the future.",
  "Keys to success: Research your ideas, plan for success, expect success, and just do it.",
  "I maintained my edge by always being a student; you will always have something new to learn.",
  "It is not the mountain we conquer, but ourselves.",
  "If what you did yesturday seems big, you haven't done anything today.",
  "Life is change; growth is optional. Choose wisely.",
  "You don't just stumble into the future you create your own future.",
  "This one step, choosing a goal and sticking to it, changes everything.",
  "Failure? I never encountered it. All I ever met were temporary setbacks.",
  "Great minds have purpose, while others just have wishes.",
  "Our life is what it is as a result of how we think.",
  "We are what and where we are because we have first imagined it.",
  "Even a mistake may turn out to be the one thing necessary to a worthwhile achievement.",
  "Action, to be effective, must be directed to clearly conceived ends.",
  "Our imagination is the only limit to what we can hope to have in the future.",
  "He who is afraid of asking is ashamed of learning.",
  "Obstacles are what appear when you take your eyes off your dreams.",
  "If we always look back, we lose sight of what's ahead.",
  "Success based on anything but internal fulfillment is bound to be empty.",
  "Do not wait for ideal circumstances, nor for the best opportunities; they will never come.",
  "Triumph often is nearest when defeat seems inescapable.",
  "An error gracefully acknowledged is a victory won.",
  "The courage to be is the courage to accept oneself, in spite of being unacceptable.",
  "Confidence imparts a wonderful inspiration to its possessor.",
  "The universe is full of magical things, patiently waiting for our wits to grow sharper.",
  "The death of fear is in doing what you fear to do.",
  "When we place blame, we give away our power.",
  "What really matters is what you do with what you have.",
  "Happiness does not depend on outward things, but on the way we see them.",
  "Your self-beliefs either support or undermine you.",
  "The greatest mistake you can make in life is to be continually fearing you will make one.",
  "While we may not be able to control all that happens to us, we can control what happens inside us.",
  "Draw from others the lesson that may profit yourself.",
  "Living a life of integrity is one of the greatest missions we can undertake.",
  "Life does not happen to us, it happens from us.",
  "What concerns me is not the way things are, but rather the way people think things are.",
  "No one can make you feel inferior without your consent.",
  "Where there is no vision, the people perish.",
  "They are able because they think they are able.",
  "Whatever we leave to God, God does and blesses us.",
  "Therefore do not worry about tomorrow, for tomorrow will worry about its own things. Sufficient for the day is its own trouble.",
  "Growth and change are never easy...If it were easy, you would have done it long ago.",
  "Repeat anything long enough and it will start to become you.",
  "Great minds have purpose, others have wishes.",
  "There is no security on this earth; there is only opportunity.",
  "The first step towards success in any occupation is to become interested in it.",
  "Ultimately we know deeply that the other side of every fear is a freedom.",
  "Man is a goal-seeking animal. His life only has meaning if he is reaching out and striving for his goals.",
  "Human beings can alter their lives by altering their attitudes of mind.",
  "We cannot always build the future for our youth, but we can build our youth for the future.",
  "Follow your instincts. That's where true wisdom manifests itself.",
  "Opportunity does not knock; it presents itself when you beat down the door.",
  "But no one thinks of changing himself.",
  "You are not what you think you are, but what your THINK, you are.",
  "Fears are educated into us and can, if we wish, be educated out..",
  "However beautiful the strategy, you should occasionally look at the results.",
  "The pain lies in the difference of what we think should happen and what actually happens.",
  "It is in the expectations of happiness that much of happiness itself is found.",
  "Defeat is not the worst of failures. Not to have tried is the true failure..",
  "If you change the way you look at things, the things you look at change..",
  "Courage is doing what you're afraid to do. There can be no courage unless you're scared.",
  "It is the greatest of all mistakes to do nothing because you can do only a little. Do what you can.",
  "All big things in this world are done by people who are naive and have an idea that is obviously impossible.",
  "In the best institutions, promises are kept, no matter what the cost in agony and overtime..",
  "I find that the harder I work the more luck I seem to have..",
  "Man never made any material as resilient as the human spirit.",
  "Not everything that can be counted counts and not everything that counts can be counted..",
  "It is our choices . . . that show what we truly are, far more than our abilities..",
  "All things are difficult before they are easy.",
  "Far and away the best prize that life offers is the chance to work hard at work worth doing..",
  "The Truth is realized in an instant; the Act is practiced step by step.",
  "Adversity is the diamond dust heaven polishes its jewels with..",
  "Every artist was first an amateur..",
  "The genius of money is not knowing everything, but rather, surrounding yourself with those who do.",
  "Efficiency is doing things right. Effectiveness is doing the right things..",
  "You wander from room to room. Hunting for the diamond necklace that is already around your neck!.",
  "It is not easy to find happiness in ourselves, and it is not possible to find it elsewhere.",
  "We cannot teach people anything; we can only help them discover it within themselves.",
  "Man will occasionally stumble over the truth, but most times he will pick himself up and carry on.",
  "Luck is when preparation meets opportunity..",
  "The greatest amount of wasted time is the time not getting started.",
  "Argue for your limitations, and sure enough, they're yours.",
  "There are two types of speakers, those that are nervous and those that are liars.",
  "The world hates change, yet it is the only thing that has brought progress.",
  "You must begin to think of yourself as becoming the person you want to be.",
  "Of all the judgments we pass in life, none is as important as the one we pass on ourselves.",
  "Recommend to your children virtue; that alone can make them happy, not gold..",
  "If you let conditions stop you from working, they'll always stop you.",
  "Only those who risk going too far can possibly find out how far one can go..",
  "To win, you have to risk loss..",
  "Expertise is generic. Point of view is what audiences pay for.",
  "We have to live today by what truth we can get today and be ready tomorrow to call it falsehood..",
  "YOU don't have to get it right, YOU just have to get it going..",
  "In all affairs it's a healthy thing to hang a question mark on the things you have long taken for granted..",
  "Modesty is the only sure bait when you angle for praise..",
  "The greatest success stories were created by people who recognized a problem and turned it into an opportunity.",
  "The roots of education are bitter, but the fruit is sweet..",
  "People living deeply have no fear of death..",
  "If your project doesn't work, look for the part that you didn't think was important.",
  "Experience is simply the name we give our mistakes..",
  "We make a We make a living by what we get. We make a life by what we give.",
  "To win, you have to risk loss..",
  "Efficiency is doing things right. Effectiveness is doing the right things..",
  "We are what we repeatedly do..",
  "Life is like a game of cards. The hand that is dealt you is determinism; the way you play it is free will..",
  "Half the troubles of this life can be traced to saying yes too quickly and not saying no soon enough..",
  "Even the fear of death is nothing compared to the fear of not having lived authentically and fully..",
  "If you let conditions stop you from working, they'll always stop you.",
  "Nothing can add more power to your life than concentrating all of your energies on a limited set of targets..",
  "Too many people are thinking of security instead of opportunity. They seem more afraid of life than death.",
  "Shoot for the moon. Even if you miss it, you will land among the stars..",
  "Knowing is not enough; we must apply. Willing is not enough; we must do..",
  "A leader must know, must know that he knows and must be able to make it abundantly clear to those about him that he knows..",
  "Our only limitations are those which we set up in our minds or permit others to establish for us..",
  "You are not only responsible for what you say, but also for what you do not say.",
  "The beginning is the most important part of the work..",
  "Wealth is the product of a man\'s capacity to think..",
  "Prosperity is a great teacher; adversity is a greater one.",
  "Change the way you look at things, and the things you look at change.",
  "Begin With The End in Mind.",
  "I decided to be the best and the smartest..",
  "To avoid criticism... Do nothing... Say nothing... Be nothing!.",
  "The noblest search is the search for excellence.",
  "Excellence is the gradual result of always striving to do better.",
  "Do what you love to do and commit yourself to doing it in an excellent fashion.",
  "Cherish your visions and your dreams as they are the children of your soul, the blueprints of your ultimate accomplishments.",
  "Nearly all men can stand adversity, but if you want to test a man\'s character, give him power..",
  "My great concern is not whether you have failed, but whether you are content with your failure.",
  "Everyone has his burden. What counts is how you carry it.",
  "You haven't failed until you quit trying.",
  "You're on the road to success when you realize that failure is only a detour.",
  "I am not discouraged, because every wrong attempt discarded is another step forward.",
  "Dreams are extremely important. You can\'t do it unless you imagine it..",
  "In business, the competition will bite you if you keep running; if you stand still, they will swallow you..",
  "Success is the proper utilization of failure.",
  "Champions aren't made in the gyms. Champions are made from something they have deep inside them, a desire, a dream, a vision.",
  "Rowing harder doesn't help if the boat is headed in the wrong direction..",
  "It takes as much energy to wish as it does to plan..",
  "There are many truths of which the full meaning cannot be realized until personal experience has brought it home..",
  "Pleasure in the job puts perfection in the work.",
  "Everybody thinks of changing humanity, but nobody thinks of changing himself..",
  "True commitment...is the power of getting out of any situation all that there is in it. It is arduous, and it is rare..",
  "Laziness is a secret ingredient that goes into failure. But it\'s only kept a secret from the person who fails..",
  "Difficulties are meant to rouse, not discourage. The human spirit is to grow strong by conflict..",
  "Why not go out on a limb? Isn't that where the fruit is?.",
  "The biggest mistake people make in life is not making a living at doing what they most enjoy.",
  "Man is the only creature that strives to surpass himself and yearns for the impossible.",
  "You're writing the story of your life one moment at a time.",
  "You'll see it, when you believe it.",
  "Dream lofty dreams, and as you dream, so shall you become. Your vision is the promise of what you shall one day be.",
  "Things may come to those who wait, but only the things left by those who hustle..",
  "Self trust is the first secret of success.",
  "It is easier to be wise for others than for ourselves..",
  "As I see it, every day you can do one of two things: build health or produce disease in yourself..",
  "People with goals succeed because they know where they are going... It's as simple as that.",
  "Change your direction and you will change your destiny.",
  "Democracy is a process by which the people are free to choose the man who will get the blame.",
  "A teacher who is attempting to teach, without inspiring the pupil with a desire to learn, is hammering on a cold iron.",
  "The strangest and most fantastic fact about negative emotions is that people actually worship them.",
  "In the middle of difficulty lies opportunity..",
  "There are only two ways to live your life. One is as though nothing is a miracle. The other is as if everything is.",
  "Real courage is moving forward when the outcome is uncertain.",
  "Nothing is a waste of time if you use the experience wisely.",
  "Concentration comes out of a combination of confidence and hunger..",
  "I have not failed. I've just found 10,000 ways that won't work.",
  "Genius without education is like silver in the mine.",
  "You are accountable for what you do, and no one else is accountable..",
  "Luck is not chance; it\'s toil. Fortune\'s expensive smile is earned..",
  "Success is more a function of consistent common sense than it is of genius..",
  "In a time of universal deceit, telling the truth is a revolutionary act.",
  "Academic qualifications are important and so is financial education. They're both important and schools are forgetting one of them.",
  "Good judgment is gained through experience. Experience is gained through poor judgment..",
  "The most powerful weapon on Earth is the human soul on fire..",
  "You can find on the outside only what you possess on the inside.",
  "There is nothing more genuine than breaking away from the chorus to learn the sound of your own voice.",
  "For all sad words of tongue and pen, the saddest are these, 'It might have been'.",
  "Take a chance! All life is a chance. The man who goes furthest is generally the one who is willing to do and dare.",
  "You must be the change you wish to see in the world.",
  "Follow effective action with quiet reflection. From the quiet reflection will come even more effective action..",
  "True leadership must be for the benefit of the followers, not the enrichment of the leaders..",
  "It is not how much we do, but how much love we put in the doing. It is not how much we give, but how much love we put in the giving.",
  "The moment you let avoiding failure become your motivator, you\'re down the path of inactivity..",
  "You\'ve got to get to the stage in life where going for it is more important than winning or losing..",
  "I judge character not by how men deal with their superiors, but mostly how they deal with their subordinates.",
  "To attain knowledge, add things every day.",
  "To attain wisdom, remove things every day.",
  "Don\'t waste your effort on a thing that results in a petty triumph unless you are satisfied with a life of petty issues.",
  "If we are strong, our strength will speak for itself. If we are weak, words will be of no help..",
  "No set goal achieved satisfies. Success only breeds a new goal. The golden apple devoured has seeds. It is endless..",
  "Wherever you see a successful business, someone once made a courageous decision..",
  "Use the past as a guide for the future, not as an excuse for not dealing with it.",
  "Nearly all men can stand adversity, but if you want to test a man\'s character, give him power..",
  "Don\'t wait around for other people to be happy for you. Any happiness you get you\'ve got to make yourself..",
  "Money was never a big motivation for me, except as a way to keep score. The real excitement is playing the game.",
  "Men is a money-making animal with propensity too often interferes with his benevolence..",
  "Many speak the truth when they say that they despise riches, but they mean the riches possessed by other men.",
  "Most people are to busy earning a living to make any money.",
  "Pattern your Life after success not indifference..",
  "Knowledge-based innovation has the longest lead time of all innovations..",
  "Knowledge is the antidote to fear.",
  "Happiness is not in the mere possession of money; it lies in the joy of achievement, in the thrill of creative effort.",
  "Be civil to all; sociable to many; familiar with few; friend to one; enemy to none.",
  "The Way is not difficult; only there must be no wanting or not wanting.",
  "How shall I grasp it? Do not grasp it. That which remains when there is no more grasping is the Self.",
  "Zen has nothing to grab on to. When people who study Zen don't see it,that is because they approach it too eagerly.",
  "Small opportunities are often the beginning of great enterprises.",
  "Everyone has a talent. What is rare is the courage to nurture it in solitude and to follow the talent to the dark places where it leads.",
  "The individual activity of one man with backbone will do more than a thousand men with a mere wishbone.",
  "It sounds boring, but anything is easy to start - starting a novel, starting a business ... it's keeping the thing going that is difficult.",
  "Take the negativity, conquer it with indifference, and use it to achieve your goal, wealth, health and happiness.",
  "If you aren\'t fired by enthusiasm, you will be fired with enthusiasm..",
  "Education is simply the soul of a society as it passes from one generation to another.",
  "Be careful what you do, because what you do is what you end up doing.",
  "You can do anything you want to do, but you can not do all the things you want to do.",
  "The human brain starts working the moment you are born and never stops until you stand up to speak in public.",
  "Make sure you have finished speaking before your audience has finished listening.",
  "Every idea you present must be something you could get across easily at a cocktail party with strangers..",
  "Courage and perseverance have a magical talisman, before which difficulties disappear and obstacles vanish into air..",
  "When you dance, your purpose is not to get to a certain place on the floor.",
  "It's to enjoy each step along the way.",
  "I find that when you have a real interest in life and a curious life, that sleep is not the most important thing.",
  "This was work (music industry) but it was the awakening to what was to become a life's passion.",
  "A man who dares to waste one hour of life has not discovered the value of life.",
  "Doing what you love is the cornerstone of having abundance in your life.",
  "It's much easier for me to make major life, multi-million dollar decisions, than it is to decide on a carpet for my front porch. That's the truth.",
  "You are doomed to make choices. This is life\'s greatest paradox.",
  "Succeeding is not really a life experience that does that much good. Failing is a much more sobering and enlightening experience.",
  "Life is a succession of lessons which must be lived to be understood.",
  "Don't be too timid and squeamish about your actions. All life is an experiment.",
  "There never was a good war or a bad peace.",
  "Up, sluggard, and waste not life; in the grave will be sleeping enough.",
  "It's all about quality of life and finding a happy balance between work and friends and family.",
  "I love the market, it is my work, my play and my life.",
  "Most people struggle with life balance simply because they haven't paid the price to decide what is really important to them.",
  "It is decidedly not true that \'nice guys finish last\'.",
  "Getting money is not all a man's business: to cultivate kindness is a valuable part of the business of life.",
  "People first, then money, then things.",
  "I think one can achieve a very pleasant lifestyle by treating human beings, fellow human beings, very well.",
  "How am I going to live today in order to create the tomorrow I'm committed to?.",
  "The man who does not work for the love of work but only for money is not likely to make money nor find much fun in life.",
  "Anyone who thinks my story is anywhere near over is sadly mistaken.",
  "What you do speaks so loudly that I cannot hear what you say. .",
  "The world and life have been mighty good to me. And I want to put something back.",
  "A big part of financial freedom is having your heart and mind free from worry about the what-ifs of life.",
  "We are not animals. We are not a product of what has happened to us in our past. We have the power of choice.",
  "You will become as great as your dominant aspiration...if you cherish a vision in your heart, you will realize it.",
  "The difference between the impossible and the possible lies in not giving up..",
  "The important thing is to learn a lesson every time you lose..",
  "You can\'t help someone get up a hill without getting closer to the top yourself..",
  "- you\'ve got to build a fire within them.",
  "In the business world, the rearview mirror is always clearer than the windshield..",
  "Do not go where the path may lead, go instead where there is no path and leave a trail..",
  "We know what we are, but know not what we may be..",
  "It's hard for young players to see the big picture. They just see three or four years down the road.",
  "Man's mind stretched to a new idea never goes back to its original dimensions.",
  "Give a lot of thought to the future because that is where you are going to spend the rest of your life.",
  "The time you enjoy wasting is not wasted time.",
  "Remember, a dead fish can float downstream, but it takes a live one to swim upstream..",
  "You must avoid the investigation trap you can\'t postpone tough decisions by studying them to death..",
  "Luck is a dividend of sweat. The more you sweat, the luckier you get..",
  "Great things are done by a series of small things brought together.",
  "Never assume the obvious is true..",
  "Nothing in life is to be feared. It is only to be understood..",
  "If I have ever made any valuable discoveries, it has been owing more to patient attention than to any other talent..",
  "Never tell people how to do things. Tell them what to do, and they will surprise you with their ingenuity.",
  "Money isn't the most important thing in life, but it's reasonably close to oxygen on the gotta have it scale. .",
  "Some of us are timid. We think we have something to lose, so we don\'t try for the next hill..",
  "To a brave man, good and bad luck are like his right and left hand. He uses both.",
  "I take advice from five wise men: Mr Who, Mr Where, Mr What, Mr Why and Mr When.",
  "Good plans shape good decisions. That's why good planning helps to make elusive dreams come true.",
  "Concentration, in its truest, unadulterated form, means the ability to focus the mind on one single solitary thing.",
  "Be not afraid of life. Believe that life is worth living and your belief will help create the fact.",
  "The first requisite of success is the ability to apply your physical and mental energies to one problem without growing weary..",
  "Reading without reflection is like eating without digesting..",
  "Authority does not make you a leader It gives you the opportunity to be one.",
  "Action may not always be happiness, but there is no happiness without action.",
  "Life is mostly froth and bubble, Two things stand like stone, Kindness in another's trouble, Courage in your own.",
  "The work of the individual still remains the spark that moves mankind forward.",
  "The biggest mistake people make in life is not making a living at doing what they most enjoy.",
  "There are a thousand excuses for every failure but never a good reason..",
  "We cannot cross the sea merely by staring at the water.",
  "The noblest search is the search for excellence.",
  "I do not try to dance better than anyone else. I only try to dance better than myself..",
  "Writing is the gold standard of communication. Learn to do it well and see more gold.",
  "Indecision is the thief of opportunity.",
  "The will to believe is perhaps the most powerful, but certainly the most dangerous, human attribute..",
  "Would that I could stand on a busy corner, hat in hand, and beg people to throw me all their wasted hours.",
  "Excellence is the gradual result of always striving to do better.",
  "Do what you love to do and commit yourself to doing it in an excellent fashion.",
  "You don\'t get to choose how you\'re going to die. Or when. You can only decide how you\'re going to live. And that is Now..",
  "Fear is that little darkroom where negatives are developed.",
  "Failure will never overtake me if my determination to succeed is strong enough.",
  "If you are never scared, embarrassed or hurt, it means you never take chances.",
  "Courage is not the lack of fear. It is acting in spite of it..",
  "One person with courage makes a majority.",
  "All life is a chance. So take it! The person who goes furthest is the one who is willing to do and dare..",
  "The world always steps aside for people who know where they\'re going.",
  "They can conquer who believe they can..",
  "Strength does not come from physical capacity. It comes from an indomitable will.",
  "Audiences don't care what you've done. They care about what you've learned.",
  "All difficult things have their origin in that which is easy, and great things in that which is small.",
  "You will become as great as your dominant aspiration...if you cherish a vision in your heart, you will realize it.",
  "Cherish your visions and your dreams, as they are the children of your soul, the blueprints of your ultimate accomplishments.",
  "You will succeed best when you put the restless, anxious side of affairs out of mind, and allow the restful side to live in your thoughts.",
  "I don't know the key to success, but the key to failure is to try to please everyone.",
  "Make no little plans; they have no magic to stir men\'s blood . . . Make big plans, aim high in hope and work..",
  "Millions long for immortality and they do not know what to do with themselves on a lonely Sunday afternoon..",
  "The world cares very little about what a man or woman knows; it is what a man or woman is able to do that counts.",
  "Do unto others as they would have you do unto them..",
  "Don\'t treat others the way you want to be treated. Treat others the way THEY want to be treated..",
  "You control your life by controlling your time..",
  "Nearly all men can stand adversity, but if you want to test a man\'s character, give him power..",
  "I take nothing for granted. I now have only good days, or great days..",
  "Few cases of eye strain have been developed by looking on the bright side of things..",
  "Enthusiasm spells the difference between mediocrity and accomplishment..",
  "When it\'s time to make a decision about a person or problem, trust your intuition (and) act..",
  "A man that cannot be bothered to do little things, cannot be trusted to do big things..",
  "Big problems arise from small problems. The wise takes care of all his small problems. Thus he has no problems.",
  "My great concern is not whether you have failed, but whether you are content with your failure.",
  "Good will is the one and only asset that competition cannot undersell or destroy..",
  "Nothing will ever be attempted if all possible objections must first be overcome..",
  "Success is a journey, not only a destination. The doing is often more important than the outcome..",
  "Truth has no special time of its own. Its hour is now - always.",
  "No great man ever complains of want of opportunity..",
  "Learning is not attained by chance; it must be sought for with ardor and attended to with diligence..",
  "The real voyage of discovery consists of not in seeking new landscapes but in having new eyes..",
  "Have something to say, and say it as clearly as you can. This is the only secret to style.",
  "If you think you can or if you think you can\'t either way, you are right!.",
  "All life is a chance. So take it! The person who goes furthest is the one who is willing to do and dare..",
  "Keep your fears to yourself, but share your courage with others..",
  "We as human beings have the power of attitude and that attitude determines choice, and choice determines results.",

  "How we spend our days is, of course, how we spend our lives.",
  "Reading is a means of thinking with another person\'s mind; it forces you to stretch your own..",
  "You must learn how to handle difficulty; it always comes after opportunity..",
  "It is our attitude at the beginning of a difficult task which, more than anything else, will affect it's successful outcome.",
  "No great performance came from holding back.",
  "When you are clear on what you want in your life, it will show up and only to the extent you are clear.",
  "Transform challenge into choices, obstacles into opportunity, and tragedy into triumph.",
  "Even if you\'re on the right track, you\'ll get run over if you just sit there..",
  "You haven't failed until you quit trying.",
  "There are a thousand hacking at the branches of evil to one who is hacking at the roots.",
  "If we have our own why of life, we can clear almost any how..",
  "To earn more, you must learn more..",
  "If you are not committed to getting better at what you are doing, you are bound to get worse.",
  "Develop your willpower so that you can make yourself do what you should do, when you should do it, whether you feel like it or not.",
  "Integrity makes my job easier. It\'s deception and dishonesty that requires so much diligent effort..",
  "You are what you are today because of the choices you made in the past..",
  "A discovery is said to be an accident meeting a prepared mind..",
  "Everything comes to he who hustles while he waits..",
  "Noise proves nothing. Often a hen that has merely laid an egg cackles as if she laid an asteroid..",
  "Example is not the main thing in influencing others, it is the only thing..",
  "It is amazing what can be accomplished when nobody cares about who gets the credit..",
  "Knowing is not enough; we must apply. Willing is not enough; we must do..",
  "We want to reach for the stars and not merely across the table..",
  "Together, one person, one course at a time we can transform the world.",
  "Find the good. It\'s all around you. Find it, showcase it and you\'ll start believing in it..",
  "We must never allow our mediocre successes to cloud our future expectations..",
  "We are sitting in the shade today because someone planted a tree a long time ago.",
  "Maturity is achieved when a person postpones immediate pleasures for long- term values.",
  "You're on the road to success when you realize that failure is only a detour.",
  "Success is a lousy teacher. It seduces smart people into thinking they can\'t lose..",
  "Employ your time in improving yourself by other men\'s writings so that you shall come easily by what others have labored hard for.",
  "Pessimist: A person who says that O is the last letter in ZERO, Instead of the first letter in word OPPORTUNITY.",
  "Concentration, in its truest, unadulterated form, means the ability to focus the mind on one single solitary thing.",
  "Don\'t give up trying to do what you really want to do. Where there is love, inspiration and hard work. I don\'t think you can go wrong..",
  "Real integrity is doing the right thing, knowing that nobody\'s going to know whether you did it or not.",
  "There is never enough time to do everything, but there is always enough time to do the most important thing.",
  "When you go through the bottom of one thing, you wind on the top of another.",
  "The illiterate of the 21st century will not be those who cannot read and write but those who cannot learn, unlearn, and relearn.",
  "Dreams are extremely important. You can\'t do it unless you imagine it.",
  "Imagination is more important than knowledge.",
  "The wisest mind has something yet to learn..",
  "The greatest discovery of my generation is that human beings can alter their lives by altering their attitudes of mind..",
  "Nothing works until you do.",
  "The mere fact that you have obstacles to overcome is in your favor..",
  "Defensive strategy never has produced ultimate victory..",
  "I have never seen pessimists make anything work, or contribute anything of lasting value..",
  "Power is not revealed by striking hard or often, but by striking true..",
  "Weak desires bring weak results..",
  "In business, the competition will bite you if you keep running; if you stand still, they will swallow you..",
  "Attitude determines choice, and choice determines results..",
  "Ninety-nine percent of failures come from people who have the habit of making excuses..",
  "So, I learn from my mistakes. It\'s a very painful way to learn, but without pain, the old saying is, there\'s no gain..",
  "There is no inevitability in history except as men make it..",
  "It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change..",
  "The greatest of faults is to be conscious of none..",
  "If an individual wants to be a leader and isn\'t controversial, that means he never stood for anything.",
  "A man who wants to lead the orchestra must turn his back on the crowd.",
  "You will either step forward into growth or you will step back into safety.",
  "Rowing harder doesn't help if the boat is headed in the wrong direction..",
  "The test we must set for ourselves is not to march alone but to march in such a way that others will wish to join us..",
  "Order and simplification are the first steps toward the mastery of a subject..",
  "There are many truths of which the full meaning cannot be realized until personal experience has brought it home..",
  "We must concentrate not merely on the negative expulsion of war but the positive affirmation of peace.",
  "The genius of money is not knowing everything, but rather, surrounding yourself with those who do.",
  "I believe that the only courage anybody ever needs is the courage to follow your own dreams.",
  "Everything we call a trial, a sorrow, or a duty, believe me... the gift is there and the wonder of an overshadowing presence.",
  "Yesterday is history. Tomorrow is a mystery Today is a gift That\'s why it\'s called the present.",
  "Don't wait. The time will never be just right.",
  "Life isn\'t about getting and having it\'s about giving and being.",
  "If you can dream it, you can achieve it.",
  "How am I going to live today in order to create the tomorrow I'm committed to?",
  "Too many of us are not living our dreams because we are living our fears.",
  "Build your own dreams or someone else will hire you to build theirs.",
  "There are risks and cost to a program of action, but they are far less than the long-term risks and cost of a comfortable program of inaction..",
  "Benjamin Franklin may have discovered electricity, but it is the man who invented the meter who made the money.",
  "Pleasure in the job puts perfection in the work.",
  "We are here to add what we can do, not to get what we can from life..",
  "Hard work spotlights the character of people: some turn up their sleeves, some turn up their noses and some don\'t turn up at all.",
  "Everybody thinks of changing humanity, but nobody thinks of changing himself..",
  "If you really want something, and really work hard, and take advantage of opportunities, and never give up, you will find a way..",
  "We must have long term goals, to keep us from being frustrated by short- term failures..",
  "A great flame follows a little spark..",
  "Everything we call a trial, a sorrow, or a duty, believe me... the gift is there and the wonder of an overshadowing presence.",
  "Practice means to perform, over and over again in the face of all obstacles, some act of vision, of faith, of desire.",
  "Low self-esteem is like driving through life with your hand-break on.",
  "Think highly of yourself, for the world takes you at your own estimate..",
  "I am not what happened to me. I am what I choose to become.",
  "Education is not the filling of a pail, but the lighting of a fire..",
  "The winds and waves are always on the side of the ablest navigators..",
  "Making the simple complicated is commonplace; making the complicated simple, awesomely simple, that\'s creative.",
  "Better to light one small candle than to curse the darkness.",
  "If opportunity doesn\'t knock, build a door..",
  "The price of greatness is responsibility..",
  "We are not human beings on a spiritual journey. We are spiritual beings on a human journey.",
  "Laziness is a secret ingredient that goes into failure. But it\'s only kept a secret from the person who fails..",
  "Few things help an individual more than to place responsibility upon him, and to let him know that you trust him.",
  "The virtue of man ought to be measured, not by his extraordinary exertions, but by his everyday conduct.",
  "People are usually paid to get results, not to be perfect..",
  "Ninety-nine percent of failures come from people who have a habit of making excuses..",
  "Only those who will risk going too far can possibly find out how far one can go.",
  "Opportunities are usually disguised as hard work, so most people don\'t recognize them.",
  "The tragedy of life doesn't lie in not reaching your goal. The tragedy lies in having no goal to reach.",
  "Get a good idea and stay with it. Dog it, and work at it until it\'s done right..",
  "Difficulties are meant to rouse, not discourage. The human spirit is to grow strong by conflict.",
  "If a man goes into business with only the idea of making money, the chances are he won\'t..",
  "The secret of change consists in spending your energy on creating the new and not in fighting the old.",
  "It makes small numbers formidable, procures success to the weak, and esteem to all..",
  "Confidence is contagious. So is lack of confidence.",
  "Advances are made by those with at least a touch of irrational confidence in what they can do.",
  "Time is nature's way of keeping everything from happening at once.",
  "The weak can never forgive. Forgiveness is the attribute of the strong.",
  "To have no vision of your own means living the vision of someone else.",
  "Play every game as if you job depends on it. It just might.",
  "Use the past as a guide for the future, not as an excuse for not dealing with it.",
  "Few things are impossible to diligence and skill..",
  "What you think of yourself is much more important than what others think of you..",
  "Only those who dare to fail greatly can ever achieve greatly.",
  "A man, as a general rule, owes very little to what he is born with.A man is what he makes himself..",
  "Daring ideas are like chessmen moved forward. They may be beaten, but they may start a winning game..",
  "Why not go out on a limb? Isn't that where the fruit is?.",
  "The person who gets the farthest is generally the one who is willing to do and dare. The sure-thing boat never gets far from shore..",
  "If we had no winter, the spring would not be so pleasant; if we did not sometimes taste of adversity, prosperity would not be so welcome.",
  "Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence..",
  "Pessimism leads to weakness, optimism to power..",
  "The way to gain a good reputation is to endeavor to be what you desire to appear.",
  "Spectacular achievements are always preceded by painstaking preparation..",
  "The greatest good you can do for another is not just to share your riches, but to reveal to him his own.",
  "Outstanding leaders have a sense of mission, a belief in themselves and the value of their work.",
  "Truth is a hard master and costly to serve, but it simplifies all problems..",
  "I didn't have 10,000 failures; I learned 10,000 ways that didn't work.",
  "Life shrinks or expands in proportion to one's courage. Anais Nin If you don't risk anything, you risk even more.",
  "The only way to fail is to fail to try.",
  "To keep yourself honest, imagine a camcorder recording all your decisions..",
  "Learn to differentiate between what is truly important and what can be dealt with at another time..",
  "I know fear is an obstacle for some people, but it is an illusion to me...failure always made me try harder next time.",
  "You can't build a reputation on what you are going to do.",
  "A dose of adversity is often as needful as a dose of medicine.",
  "If you want the rainbow, you've got to put up with the rain..",
  "To Make Progress You Must Actually Get Started. The key is to take a step today.",
  "Money is a reward you receive for the service you render. The more valuable the service, the greater the reward..",
  "Act as if you were already happy, and that will tend to make you happy..",
  "Being broke is a temporary situation. Being poor is a mental state.",
  "Everyone who got where he is had to begin where he was..",
  "We are continuously faced by great opportunities brilliantly disguised as insoluble problems..",
  "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation.",
  "We must use time wisely and forever realize that the time is always ripe to do right.",
  "The greatest good you can do for another is not just to share your riches, but to reveal to him his own..",
  "We are what we repeatedly do. Excellence, then, is not an act but a habit..",
  "Progress is a nice word. But change is its motivator. And change has its enemies..",
  "I am not bound to win, but I am bound to be true. I am not bound to succeed, but I am bound to live by the light that I have",
  "Assumption is the mother of mistakes.",
  "I do not believe in a fate that falls on men however they act, but I believe in a fate that falls on men unless they act..",
  "The results should either applaud you or prod you.",
  "It takes but one positive thought when given a chance to survive and thrive to overpower an entire army of negative thoughts.",
  "Great minds have purposes, others have wishes..",
  "A man, as a general rule, owes very little to what he is born with - a man is what he makes himself.",
  "Success is a lousy teacher. It seduces smart people into thinking they can\'t lose..",
  "All speech is vain and empty unless it be accompanied by action..",
  "You cannot tailor make your situation in life, but you can tailor make your attitudes to fit those situations.",
  "In real estate, it\'s location, location, location. In business, it\'s differentiate, differentiate, differentiate.",
  "Always bear in mind that your own resolution to succeed is more important than any other..",
  "Persistence: Fall down seven times; Stand up eight.",
  "Tact is the knack of making a point without making an enemy..",
  "You can't push anyone up the ladder unless he is willing to climb himself.",
  "Confidence imparts a wonderful inspiration to its possessor.",
  "Yesterday is not ours to recover, but tomorrow is ours to win or to lose..",
  "Growth demands a temporary surrender of security.",
  "Everything depends upon execution; having just a vision is no solution..",
  "The bitterest tears shed over graves are for words left unsaid and deeds left undone..",
  "Daring ideas are like chessmen moved forward; they may be beaten, but they may start a winning game.",
  "You\'re never a loser until you quit trying..",
  "I\'ve learned that people will forget what you said people will forget what you did, but people will never forget how you made them feel.",
  "Life is 10% what happens to me and 90% of how I react to it.",
  "Go confidently in the direction of your dreams. Live the life you have imagined.",
  "Life is what happens to you while you\'re busy making other plans.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Whatever the mind of man can conceive and believe, it can achieve.",
  "Dream big and dare to fail.",
  "If you want to lift yourself up, lift up someone else.",
  "A good plan violently executed now is better than a perfect plan executed next week.",
  "Two roads diverged in a wood and I-I took the one less traveled by, And that has made all the difference.",
  "A journey of a thousand miles must begin with a single step.",
  "What would you do if you weren't afraid?",
  "If you let conditions stop you from working, they'll always stop you.",
  "A goal without a plan is just a wish.",
  "Progress is a nice word. But change is its motivator. And change has its enemies..",
  "A leader is best when people barely know he exists, when his work is done, his aim fulfilled, they will say: we did it ourselves.",
  "A man who dares to waste one hour of life has not discovered the value of life.",
  "A person who never made a mistake never tried anything new.",
  "A truly rich man is one whose children run into his arms when his hands are empty.",
  "A true leader has the confidence to stand alone, the courage to make tough decisions, and the compassion to listen to the needs of others.",
  "All the forces in the world are not so powerful as an idea whose time has come.",
  "Anyone can hold the helm when the sea is calm.",
  "A goal is not always meant to be reached; it often serves simply as something to aim at.",
  "Definiteness of purpose is the starting point of all achievement.",
  "Fall seven times and stand up eight.",
  "If one advances confidently in the direction of his dreams, and endeavors to live the life he has imagined, he will meet with a success unexpected in common hours.",
  "Goals are dreams with deadlines.",
  "I am not a product of my circumstances I am a product of my decisions.",
  "I cannot give you the formula for success, but I can give you the formula for failure, which is: Try to please everybody.",
  "I recommend to you to take care of the minutes; for hours will take care of themselves.",
  "If you\'re offered a seat on a rocket ship, don\'t ask what seat! Just get on.",
  "Impossible is a word to be found only in the dictionary of fools.",
  "The only way to do great work is to love what you do.",
  "It is better to have lived one day as a tiger than a thousand years as a sheep.",
  "It\'s not the years in your life that count It\'s the life in your years.",
  "My interest in life comes from setting myself huge, apparently unachievable challenges and trying to rise above them.",
  "Lead me, follow me, or get out of my way.",
  "Money is a wonderful thing but it is possible to pay too high a price for it.",
  "If you\'re going through hell, keep going!",
  "Shoot for the moon. Even if you miss, you'll land among the stars.",
  "Life is not measured by the number of breaths we take, but by the moments that take our breath away.",
  "Not the cry, but the flight of a wild duck, leads the flock to fly and follow.",
  "Strive not to be a success, but rather to be of value.",
  "Take care of the minutes and the hours will take care of themselves.",
  "The greatest dreams are always unrealistic.",
  "The mind is everything What you think you become.",
  "The question isn\'t who is going to let me; it\'s who is going to stop me.",
  "The two most important days in your life are the day you are born and the day you find out why.",
  "There are no traffic jams along the extra mile.",
  "There is nothing so useless as doing efficiently that which should not be done at all.",
  "There is only one way to avoid criticism: do nothing, say nothing, and be nothing.",
  "Time is the coin of your life. It is the only coin you have, and only you can determine how it will be spent. Be careful lest you let other people spend it for you.",
  "We become what we think about.",
  "What\'s money? A man is a success if he gets up in the morning and goes to bed at night and in between does what he wants to do.",
  "Whatever you are, be a good one.",
  "Whatever you can do, or dream you can, begin it. Boldness has genius, power and magic in it.",
  "Where there is no vision, the people perish.",
  "When I was 5 years old, my mother always told me that happiness was the key to life.\tWhen I went to school, they asked me what I wanted to be when I grew up. I wrote down \'happy\'.\tThey told me I didn\'t understand the assignment, and I told them they didn\'t understand life.",
  "Whether you think you can or you think you can\'t, you\'re right.",
  "You become what you believe.",
  "You miss 100% of the shots you don\'t take.",
  "You will never find time for anything If you want time you must make it.",
  "Change your thoughts and you change your world.",
  "Never doubt that a small group of thoughtful, concerned citizens can change world. Indeed it is the only thing that ever has.",
  "Neither success nor failure are ever final.",
  "You are not defined by your past. You are prepared by your past.",
  "Always do what you are afraid to do.",
  "We tend to forget that happiness doesn't come as a result of getting something we don't have, but rather recognizing and appreciating what we do have.",
  "Nobody can go back and start a new beginning, but anyone can start today and make a new ending.",
  "Seek opportunity, not security A boat in a harbor is safe, but in time its bottom will rot out.",
  "Don't worry about failure; you only have to be right once.",
  "I must follow the people. Am I not their leader?",
  "If you want to be happy set a goal that commands your thoughts, liberates your energy and inspires your hopes.",
  "People buy into the leader before they buy into the vision.",
  "Don't ask what the world needs. Ask what makes you come alive, and go do it. Because what the world needs is people who have come alive.",
  "The art of leadership is saying no, not saying yes. It is very easy to say yes.",
  "To command is to serve, nothing more and nothing less.",
  "We are too busy mopping the floor to turn off the faucet.",
  "What you do has far greater impact than what you say.",
  "You manage things; you lead people.",
  "A day wasted on others is not wasted on one\'s self.",
  "The greatest success stories were created by people who recognized a problem and turned it into an opportunity.",
  "A leader is a dealer in hope.",
  "A leader is one who knows the way, goes the way, and shows the way.",
  "A leader takes people where they want to go A great leader takes people where they don\'t necessarily want to go, but ought to be.",
  "A man who wants to lead the orchestra must turn his back on the crowd.",
  "All great achievements require time.",
  "All successful people have a goal. No one can get anywhere unless he knows where he wants to go and what he wants to be or do.",
  "All that really belongs to us is time; even he who has nothing else has that.",
  "All the flowers of all of the tomorrows are in the seeds of today.",
  "An unexamined life is not worth living.",
  "Arise, awake, stop not until your goal is achieved.",
  "An average person with average talents and ambition and average education, can outstrip the most brilliant genius in our society, if that person has clear, focused goals.",
  "Arriving at one goal iIs the starting point to another.",
  "Ask and it will be given to you; search, and you will find; knock and the door will be opened for you.",
  "Be mindful of how you approach time Watching the clock is not the same as watching the sun rise.",
  "Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.",
  "Believe you can and you\'re halfway there.",
  "Certain things catch your eye but pursue only those that capture the heart.",
  "Challenges are what make life interesting and overcoming them is what makes life meaningful.",
  "Destiny is no matter of chance. It is a matter of choice. It is not a thing to be waited for; it is a thing to be achieved.",
  "Discipline is the bridge between goals and accomplishment.",
  "Do not confuse motion and progress A rocking horse keeps moving but does not make any progress.",
  "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
  "Do what you can, where you are with what you have.",
  "Dost thou love life? Then do not squander time, for that\'s the stuff that life is made of.",
  "Dreaming, after all, is a form of planning.",
  "Every child is an artist The problem is how to remain an artist once he grows up.",
  "Education costs money. But then so does ignorance.",
  "Eighty percent of success is showing up.",
  "Either write something worth reading or do something worth writing.",
  "Earn your leadership every day.",
  "Either you run the day, or the day runs you.",
  "I am endlessly fascinated that playing football is considered a training ground for leadership, but raising children isn\'t.",
  "Every strike brings me closer to the next home run.",
  "Everything you\'ve ever wanted is on the other side of fear.",
  "Fear melts when you take action towards a goal you really want.",
  "Great leaders are not defined by the absence of weakness, but rather by the presence of clear strengths.",
  "Half our life is spent trying to find something to do with the time we have rushed through life trying to save.",
  "Happiness is not something readymade. It comes from your own actions.",
  "He who has great power should use it lightly.",
  "He who has never learned to obey cannot be a good commander.",
  "How wonderful it is that nobody need wait a single moment before starting to improve the world.",
  "I am looking for a lot of men who have an infinite capacity to not know what can't be done.",
  "I didn\'t fail the test I just found 100 ways to do it wrong.",
  "I have learned over the years that when one\'s mind is made up, this diminishes fear.",
  "I start with the premise that the function of leadership is to produce more leaders, not more followers.",
  "I would rather die of passion than of boredom.",
  "The purpose of our lives is to be happy.",
  "If one is lucky, a solitary fantasy can totally transform one million realities.",
  "If you aim at nothing, you will hit it every time.",
  "If you do what you\'ve always done, you\'ll get what you\'ve always gotten.",
  "If you hear a voice within you say \"you cannot paint,\" then by all means paint and that voice will be silenced.",
  "If you look at what you have in life you\'ll always have more. If you look at what you don\'t have in life, you\'ll never have enough.",
  "If your actions inspire others to dream more, learn more, do more and become more, you are a leader.",
  "In matters of style, swim with the current; in matters of principle, stand like a rock.",
  "Live fully. Love openly. Make a difference.",
  "In truth, people can generally make time for what they choose to do; it is not really the time but the will that is lacking.",
  "It doesn't matter where you are coming from All that matters is where you are going.",
  "It is good to have an end to journey toward; but it is the journey that matters, in the end.",
  "It\'s better to do the right thing slowly than the wrong thing quickly.",
  "Know the true value of time; snatch, seize, and enjoy every moment of it. No idleness, no laziness, no procrastination; Never put off till tomorrow what you can do today.",
  "Know your limits, but never stop trying to exceed them.",
  "Lead and inspire people. Don\'t try to manage and manipulate people. Inventories can be managed but people must be lead.",
  "Leaders aren\'t born, they are made And they are made just like anything else, through hard work. And that\'s the price we\'ll have to pay to achieve that goal, or any goal.",
  "Nothing is a waste of time if you use the experience wisely.",
  "Leadership does not always wear the harness of compromise.",
  "Nothing is impossible, the word itself says, \"I\'m possible!\"",
  "Leadership is the art of getting someone else to do something you want done because he wants to do it.",
  "Living without an aim is like sailing without a compass.",
  "Money, I can only gain or lose. But time I can only lose. So, I must spend it carefully.",
  "Leadership is the capacity to translate vision into reality.",
  "My responsibility is getting all my players playing for the name on the front of the jersey, not the one on the back.",
  "Leadership is the key to 99 percent of all successful efforts.",
  "Life shrinks or expands in proportion to one\'s courage.",
  "Leadership is unlocking people\'s potential to become better.",
  "Live each day as if it be your last.",
  "Lost time is never found again.",
  "Map out your future, but do it in pencil.",
  "Men make history and not the other way around. In periods where there is no leadership, society stands still. Progress occurs when courageous, skillful leaders seize the opportunity to change things for the better.",
  "Our lives begin to end the day we become silent about things that matter.",
  "Remember that not getting what you want is sometimes a wonderful stroke of luck.",
  "Start where you are. Use what you have Do what you can.",
  "The best revenge is massive success.",
  "The distance between insanity and genius is measured only by success.",
  "The first responsibility of a leader is to define reality. The last is to say thank you. In between, the leader is a servant.",
  "The key is in not spending time, but in investing it.",
  "The most common way people give up their power is by thinking they don\'t have any.",
  "The person who says it cannot be done should not interrupt the person who is doing it.",
  "The supreme quality of leadership is integrity.",
  "Time is money.",
  "Time is what we want most, but what we use worst.",
  "Try not. Do or do not. There is no try.",
  "Until thought is linked with purpose there is no intelligent accomplishment.",
  "Until we can manage time, we can manage nothing else.",
  "Until you value yourself, you will not value your time. Until you value your time you will not do anything with it.",
  "Vision without action is a daydream. Action without vision is a nightmare.",
  "There is no such thing as failure You either succeed or learn.",
  "We can easily forgive a child who is afraid of the dark; the real tragedy of life is when men are afraid of the light.",
  "We can no more afford to spend major time on minor things than we can to spend minor time on major things.",
  "When I stand before God at the end of my life I would hope that I would not have a single bit of talent left and could say, I used everything you gave me.",
  "You can never cross the ocean until you have the courage to lose sight of the shore.",
  "You can\'t fall if you don\'t climb. But there\'s no joy in living your whole life on the ground.",
  "You may be disappointed if you fail, but you are doomed if you don\'t try.",
  "You must get good at one of two things. Planting in the spring or begging in the fall.",
  "You take your life in your own hands, and what happens? A terrible thing, no one to blame.",
  "When I let go of what I am, I become what I might be.",
  "Have the courage to follow your heart and intuition. They somehow already know",
  "The death rate for people who play it safe and for people who live boldly is the same: 100%.",
  "There is no passion to be found playing small.",
  "Better three hours too soon, than one minute too late.",
  "You can\'t use up creativity The more you use, the more you have.",
  "A cowardly leader is the most dangerous of men.",
  "A deadline is negative inspiration. Still, it's better than no inspiration at all.",
  "A good general not only sees the way to victory; he also knows when victory is impossible.",
  "A great leader\'s courage to fulfill his vision comes from passion, not position.",
  "A great person attracts great people and knows how to hold them together.",
  "As long as I have a want, I have a reason for living. Satisfaction is death.",
  "As we look ahead into the next century, leaders will be those who empower others.",
  "Between the great things we cannot do and the small things we will not do, the danger is that we shall do nothing.",
  "Difficulties increase the nearer we approach the goal.",
  "Don\'t say you don\'t have enough time. You have exactly the same number of hours per day that were given to Helen Keller, Pasteur Michelangelo, Mother Teresa, Leonardo da Vinci, Thomas Jefferson, and Albert Einstein.",
  "Don't be afraid to take a big step if one is indicated; you can't cross a chasm in two small jumps.",
  "Education is the mother of leadership.",
  "If you want your children to turn out well, spend twice as much time with them and half as much money.",
  "Effective leadership is not about making speeches or being liked; leadership is defined by results not attributes.",
  "Effective leadership is putting first things first. Effective management is discipline, carrying it out.",
  "Even if you\'re on the right track, you\'ll get run over if you just sit there.",
  "Everything has beauty, but not everyone can see.",
  "Few things can help an individual more than to place responsibility on him, and to let him know that you trust him.",
  "For time and the world do not stand still Change is the law of life. And those who look only to the past or the present are certain to miss the future.",
  "Gaining time is gaining everything in love, trade and war.",
  "Goals are not only absolutely necessary to motivate us. They are essential to really keep us alive.",
  "Goals determine what you're going to be.",
  "He that rises late must trot all day.",
  "He who gains time gains everything.",
  "He who knows most grieves most for wasted time.",
  "I am reminded how hollow the label of leadership sometimes is and how heroic followership can be.",
  "I attribute my success to this: I never gave or took any excuse.",
  "I don\'t think of the past. The only thing that matters is the everlasting present.",
  "I have been impressed with the urgency of doing. Knowing is not enough; we must apply. Being willing is not enough; we must do.",
  "If the wind will not serve, take to the oars.",
  "If you don't have time to do it right you must have time to do it over.",
  "If you don't know where you are going, you will probably end up somewhere else.",
  "If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.",
  "In a day, when you don't come across any problems -you can be sure that you are travelling in a wrong path.",
  "It is a mistake to look too far ahead Only one link of the chain of destiny can be handled at a time.",
  "It is absurd that a man should rule others, who cannot rule himself.",
  "It is easier to go down a hill than up, but the view is best from the top.",
  "It is never too late to be who you might have been.",
  "It is not what you do for your children, but what you have taught them to do for themselves, that will make them successful human beings.",
  "It\'s not enough to be busy, so are the ants. The question is, what are we busy about?",
  "It\'s your place in the world; it\'s your life Go on and do all you can with it, and make it the life you want to live.",
  "Leadership cannot just go along to get along. Leadership must meet the moral challenge of the day.",
  "Leadership is a potent combination of strategy and character. But if you must be without one, be without the strategy.",
  "Life is full of obstacle illusions.",
  "Look to the future, because that is where you'll spend the rest of your life.",
  "Management is efficiency in climbing the ladder of success; leadership determines whether the ladder is leaning against the right wall.",
  "Never leave till tomorrow that which you can do today.",
  "Never let yesterday use up today.",
  "No man will make a great leader who wants to do it all himself, or to get all the credit for doing it.",
  "Nothing else, perhaps, distinguishes effective executives as much as their tender loving care of time.",
  "Nothing happens until something moves.",
  "Once you have mastered time, you will understand how true it is that most people overestimate what they can accomplish in a year -and underestimate what they can achieve in a decade.",
  "Ordinary people think merely of spending time. Great people think of using it.",
  "People often say that motivation doesn\'t last. Well, neither does bathing That\'s why we recommend it daily.",
  "Realize that now, in this moment of time you are creating. You are creating your next moment. That is what\'s real.",
  "Remember no one can make you feel inferior without your consent.",
  "So much of what we call management consists in making it difficult for people to work.",
  "The battles that count aren\'t the ones for gold medals. The struggles within yourself- the invisible battles inside all of us-that\'s where it\'s at.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "The great dividing line between success and failure can be expressed in five words: \"I did not have time.\"",
  "The higher goal a person pursues, the quicker his ability develops, and the more beneficial he will become to the society. I believe for sure that this is also a truth.",
  "The impossible is often the untried.",
  "The most difficult thing is the decision to act; the rest is merely tenacity.",
  "The most effective way to do it is to do it.",
  "The most important question to ask is, what am I becoming?",
  "The time for action is now It\'s never too late to do something.",
  "The very essence of leadership is that you have to have a vision. It\'s got to be a vision you articulate clearly and forcefully on every occasion. You can\'t blow an uncertain trumpet.",
  "There are no shortcuts to any place worth going.",
  "Though no one can go back and make a brand new start, anyone can start from now and make a brand new ending.",
  "Time is a great teacher, but unfortunately it kills all its pupils.",
  "Time lost is never found again.",
  "To do great things is difficult; but to command great things is more difficult.",
  "We must believe that we are gifted for something, and that this thing at whatever cost, must be attained.",
  "What you get by achieving your goals is not as important as what you become by achieving your goals.",
  "While we are postponing, life speeds by.",
  "You can\'t change the past, but you can ruin the present by worrying about the future.",
  "You cannot do a kindness too soon, for you never know how soon it will be too late.",
  "Every day of your working life is part of an interview for a job you don't even know you're going for yet.",
  "Risk more than others think is safe. Care more than others think is wise. Dream more than others think is practical. Expect more than others think is possible.",
  "You never know when a moment and a few sincere words can have an impact on a life.",
  "A hundred years from now it will not matter what my bank account was, the sort of house I lived in, or the kind of car I drove...but the world may be different because I was important in the life of a child.",
  "Establishing goals is all right if you don't let them deprive you of interesting detours.",
  "Great leaders are almost always great simplifiers, who can cut through argument, debate, and doubt to offer a solution everybody can understand.",
  "He does not seem to me to be a free man who does not sometimes do nothing.",
  "He lives long that lives well; and time misspent is not lived but lost.",
  "I love deadlines. I like the whooshing sound they make as they fly by.",
  "If it weren\'t for the last minute a lot of things wouldn\'t get done.",
  "If you want to make good use of your time, you\'ve got to know what\'s most important and then give it all you\'ve got.",
  "If you would hit the mark, you must aim a little above it; every arrow that flies feels the attraction of earth.",
  "If you're bored with life --you don't get up every morning with a burning desire to do things --you don't have enough goals.",
  "It is a most mortifying reflection for a man to consider what he has done, compared to what he might have done.",
  "It\'s how we spend our time here and now, that really matters. If you are fed up with the way you have come to interact with time, change it.",
  "Leaders think and talk about the solutions. Followers think and talk about the problems.",
  "Leadership and learning are indispensable to each other.",
  "Leadership is solving problems. The day soldiers stop bringing you their problems is the day you have stopped leading them. They have either lost confidence that you can help or concluded you do not care. Either case is a failure of leadership.",
  "Lost wealth may be replaced by industry, lost knowledge by study, lost health by temperance or medicine, but lost time is gone forever.",
  "Management is about arranging and telling. Leadership is about nurturing and enhancing.",
  "Only those who will risk going too far can possibly find out how far one can go.",
  "Outstanding leaders go out of their way to boost the self-esteem of their personnel. If people believe in themselves, it\'s amazing what they can accomplish.",
  "Perhaps when we find ourselves wanting everything, it is because we are dangerously close to wanting nothing.",
  "Some of the world's greatest feats were accomplished by people not smart enough to know they were impossible.",
  "Take a rest. A field that has rested yields a beautiful crop.",
  "Take the first step in faith We don't need to see the whole staircase; we just need to take the first step.",
  "Teach thy tongue to say, \"I do not know,\" and thou shalt progress.",
  "The best angle from which to approach any problem is the try-angle.",
  "The best executive is the one who has sense enough to pick good men to do what he wants done, and self-restraint enough to keep from meddling with them while they do it.",
  "The growth and development of people is the highest calling of leadership.",
  "The important thing in life is to have a great aim, and the determination to attain it.",
  "The key to successful leadership today is influence, not authority.",
  "The leader has to be practical and a realist yet must talk the language of the visionary and the idealist.",
  "The nation will find it very hard to look up to the leaders who are keeping their ears to the ground.",
  "The only person you are destined to become is the person you decide to be.",
  "The real pleasure of one's life is the devotion to a great objective of one's consideration.",
  "The rung of a ladder was never meant to rest upon, but only to hold a man's foot long enough to enable him to put the other somewhat higher.",
  "Every no gets me closer to a yes.",
  "The time you enjoy wasting is not wasted time.",
  "The world is moving so fast these days that the man who says it can't be done is generally interrupted by someone doing it.",
  "The worst days of those who enjoy what they do are better than the best days of those who don\'t.",
  "The young do not know enough to be prudent, and therefore they attempt the impossible -and achieve it, generation after generation.",
  "This time, like all times, is a very good one, if we but know what to do with it.",
  "Those who make the worse use of their time are the first to complain of its shortness.",
  "Time is a great healer, but a poor beautician.",
  "Time is really the only capital that any human being has, and the only thing he can\'t afford to lose.",
  "Time is the wisest counselor of all.",
  "Time will take your money, but money won't buy time.",
  "To think too long about doing a thing often becomes its undoing.",
  "To do two things at once is to do neither.",
  "True leadership lies in guiding others to success. In ensuring that everyone is performing at their best, doing the work they are pledged to do and doing it well.",
  "What is not started today is never finished tomorrow.",
  "What may be done at any time will be done at no time.",
  "When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.",
  "When I give a minister an order I leave it to him to find the means to carry it out.",
  "Work expands so as to fill the time available for its completion.",
  "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face. You must do the thing you think you cannot do.",
  "You may delay, but time will not.",
  "You must have long-range goals to keep you from being frustrated by short-range failures.",
  "Your goals are the road maps that guide you and show you what is possible for your life.",
  "You cannot change your destination overnight, but you can change your direction overnight.",
  "If you obey all the rules, you miss all the fun.",
  "The best way to succeed is to double your failure rate.",
  "This to shall pass.",
  "After climbing a great hill, one only finds that there are many more hills to climb.",
  "Winning isn\'t everything, but wanting to win is.",
  "You can\'t cross the sea merely by standing and staring at the water.",
  "You don\'t lead by hitting people over the head-that\'s assault, not leadership.",
  "You don\'t lead by pointing and telling people some place to go. You lead by going to that place and making a case.",
  "A competent leader can get efficient service from poor troops, while on the contrary an incapable leader can demoralize the best of troops.",
  "A ruler should be slow to punish and swift to reward.",
  "A straight path never leads anywhere except to the objective.",
  "A wise person does at once what a fool does at last. Both do the same thing; only at different times.",
  "Work like there is someone working 24 hours a day to take it away from you.",
  "The surest way to be late is to have plenty of time.",
  "The space you occupy and the authority you exercise may be measured with mathematical exactness by the service you render.",
  "If you only knock long enough and loud enough at the gate, you are sure to wake somebody up.",
  "By perseverance the snail reached the ark.",
  "There are many truths of which the full meaning cannot be realized until personal experience has brought it home..",
  "There are two cardinal sins from which all others spring: Impatience and Laziness..",
  "Better keep yourself clean and bright; you are the window through which you must see the world.",
  "It is not God\'s will merely that we should be happy, but that we should make ourselves happy..",
  "One's dignity may be assaulted, vandalized and cruelly mocked, but cannot be taken away unless it is surrendered.",
  "Not only strike when the iron is hot, but make it hot by striking..",
  "If there are things you don\'t like in the world you grew up in, make your own life different..",
  "Nothing is a greater impediment to being on good terms with others than being ill at ease with yourself.",
  "Great minds have purposes, others have wishes..",
  "Even the knowledge of my own fallibility cannot keep me from making mistakes. Only when I fall do I get up again.",
  "Self-esteem is the reputation we acquire within ourselves.",
  "Creativity is inventing, experimenting, growing, taking risks, breaking rules, making mistakes, and having fun.",
  "Difficulties are meant to rouse, not discourage. The human spirit is to grow strong by conflict.",
  "I\'ll tell you what leadership is. It\'s persuasion and conciliation, education and patience..",
  "Learning is not attained by chance; it must be sought for with ardor and attended to with diligence..",
  "Leaders are more concerned with winning than with not losing. They are more concerned with what\'s right than with who\'s right..",
  "To write something, you have to risk making a fool of yourself.",
  "I never travel without my diary. One should always have something sensational to read in the train.",
  "What is written without effort is in general read without pleasure.",
  "The future starts today, never tomorrow..",
  "Poetry is the journal of the sea animal living on land, wanting to fly in the air.",
  "It took me fifteen years to discover that I had no talent for writing, but I couldn't give it up because by that time I was too famous.",
  "It would be curious to discover who it is to whom one writes in a diary. Possibly to some mysterious personification of one's own identity.",
  "Rowing harder doesn't help if the boat is headed in the wrong direction.",
  "You don't become enormously successful without encountering and overcoming a number of extremely challenging problems..",
  "The mediocre teacher tells. The good teacher explains. The superior teacher demonstrates. The great teacher inspires.",
  "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face.",
  "The definition of insanity is doing the same thing over and over again and expecting a different result.",
  "Freedom consists not in doing what we like, but in having the right to do what we ought..",
  "Stupidity is also a gift of God, but one mustn't misuse it. Martin Luther Get a check-up from the neck up",
  "The will to win is important but the will to prepare is vital.",
  "I have learned to use the word impossible with the greatest caution..",
  "He who would accomplish little must sacrifice little; he who would achieve much must sacrifice much... ",
  "An education is like a crumbling building that needs constant upkeep with repairs and additions. ",
  "An excuse is worse and more terrible than a lie, for an excuse is a lie guarded.",
  "Discipline is the soul of an army. It makes small numbers formidable, procures success to the weak and esteem to all..",
  "A feeling of continuous growth is a wonderful source of motivation and self- confidence.",
  "Make everything you do tend toward the goal you wish to reach..",

  "Winners learn to relish change with the same enthusiasm and energy that they have resisted it in the past..",
  "Set too many goals and keep adding more goals. Goals have a tendency to be realized all at once.",
  "Work bears a particular mark of man and of humanity, the mark of a person operating within a community of persons..",
  "Be courteous to all, but intimate with few; and let those few be well tried before you give them your confidence..",
  "We cannot change anything until we accept it. ",
  "It takes 20 years to build a reputation and five minutes to lose it..",
  "Do you know what happens when you give a procrastinator a good idea? Nothing!.",
  "Big Jobs usually go to the men who prove their ability to outgrow small ones.",
  "It takes a lot of courage to show your dreams to someone else.",
  "I am careful not to confuse excellence with perfection. Excellence, I can reach for; perfection is God's business.",
  "Journal writing is a voyage to the interior.",
  "Our lives improve only when we take chances - and the first and most difficult risk we can take is to be honest with ourselves.",
  "Leaders don't create followers. They create more leaders..",
  "The glad hand is all right in sunshine, but it\'s the helping hand on a dark day that folks remember to the end of time..",
  "Just trust yourself, then you will know how to live.",
  "Hard work spotlights the character of people: some turn up their sleeves, some turn up their noses, and some don't turn up at all.",
  "Anyone who has never made a mistake has never tried anything new.",
  "The person who removes a mountain begins by carrying away small stones..",
  "Do not fear to be eccentric in opinion, for every opinion now accepted was once eccentric.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Life isn't about finding yourself. Life is about creating yourself.",
  "It is never too late to become what you might have been.",
  "And the day came when the risk it took to remain tight inside the bud was more painful than the risk it took to blossom.",
  "There is only one success--to be able to spend your life in your own way.",
  "Do you want to be safe and good, or do you want to take a chance and be great",
  "It isn't what the book costs; it's what it will cost if you don't read it..",
  "If your only prayer that you ever say is, Thank-you that will be enough.",
  "Whatever you can do or dream you can; Begin it. Boldness has genius, power and magic in it. Begin it ... Now..",
  "Many of life's failures are people who had not realized how close they were to success when they gave up.",
  "Goals are dreams with deadlines..",
  "Never doubt that a small group of thoughtful committed citizens can change the world; indeed it's the only thing that ever has.",
  "Determine that the thing can and shall be done, and then we shall find the way.",
  "There is only one thing more painful than learning from experience and that is; not learning from experience.",
  "I have always been driven to buck the system, to innovate, to take things beyond where they've been.",
  "If you're NOT a risk taker, you should get the hell out of business.",
  "There are two ways to get to the top of an oak tree. One way is to sit on an acorn and wait; the other way is to climb it.",
  "Sometimes its heaven, sometimes its hell- sometimes I don't even know. Sometimes I take it as far as I can and sometimes I don't even go.",
  "A man who carries a cat by the tail learns something he can learn in no other way..",
  "Courage is resistance to fear, mastery of fear - not absence of fear.",
  "The most wasted of all days is one without laughter.",
  "Everything should be made as simple as possible, but not simpler.",
  "God will not have His works made manifest by cowards.",
  "By thought, the thing you want is brought to you; by action you receive it.",
  "Life is a lively process of becoming.",
  "There are two primary choices in life: to accept conditions as they exist, or accept the responsibility for changing them.",
  "Drive your business! Let not that drive thee.",
  "It's a kind of spiritual snobbery that makes people think they can be happy without money.",
  "All speech is vain and empty unless it be accompanied by action.",
  "I can't say I was ever lost, but I was bewildered once for three days.",
  "Two of the greatest gifts we can give our children are roots and wings.",
  "A man may be born, but in order to be born he must first die, and in order to die he must first awake.",

  "I am not young enough to know everything.",
  "One of the great joys of youth is the privilege of not knowing any better.",
  "In three words I can sum up everything I've learned about life: it goes on.",
  "Don\'t try to be great at all things. Pick a few things to be good at and be the best you can.",
  "A clear vision, backed by definite plans, gives you a tremendous feeling of confidence and personal power..",
  "Don't limit investing to the financial world. Invest something of yourself, and you will be richly rewarded..",
  "There are three ingredients in the good life: learning, earning and yearning..",
  "Listening to the inner voice - trusting the inner voice - is one of the most important lessons of leadership. ",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work..",
  "The bitterest tears shed over graves are for words left unsaid and deeds left undone..",
  "Most misfortunes are the results of misused time..",
  "When I look into the future, it's so bright it burns my eyes..",
  "Intelligence without ambition is like a bird without wings.",
  "Some things have to be believed to be seen.",
  "Wealth is the product of man's ability to think.",
  "We must never be afraid to go too far, for success lies just beyond.",
  "High expectations are the key to everything.",
  "It is what you learn after you know it all that counts.",
  "It is no sin to attempt and fail. The only sin is to not make the attempt.",
  "Dreams are the reality of tomorrow.",
  "If anything is worth trying at all, it's worth trying at least ten times. -",
  "The atmosphere of expectancy is the breeding ground for miracles.",
  "Problems are only opportunities in work clothes.",
  "The best way to escape from a problem is to solve it.",
  "You will become as small as your controlling desire; as great as your dominant aspiration.",
  "Procrastination is opportunities natural assassin.",
  "Nothing is particularly hard if you divide it into small jobs.",
  "You can't build a reputation on what you are going to do.",
  "When I've heard all I need to make a decision, I don't take a vote. I make a decision.",
  "You can't have a better tomorrow if you are thinking about yesterday all the time.",
  "Never complain about what you permit.",
  "Take heed: you do not find what you do not seek.",
  "Our imagination is the only limit to what we can hope to have in the future.",
  "Keys to success: Research your ideas, plan for success, expect success, and just do it.",
  "I maintained my edge by always being a student; you will always have something new to learn.",
  "It is not the mountain we conquer, but ourselves.",
  "If what you did yesturday seems big, you haven't done anything today.",
  "Life is change; growth is optional. Choose wisely.",
  "You don't just stumble into the future you create your own future.",
  "This one step, choosing a goal and sticking to it, changes everything.",
  "Failure? I never encountered it. All I ever met were temporary setbacks.",
  "Great minds have purpose, while others just have wishes.",
  "There are many truths of which the full meaning cannot be realized until personal experience has brought it home..",
  "Our life is what it is as a result of how we think.",
  "We are what and where we are because we have first imagined it.",
  "Even a mistake may turn out to be the one thing necessary to a worthwhile achievement.",
  "Action, to be effective, must be directed to clearly conceived ends.",
  "Our imagination is the only limit to what we can hope to have in the future.",
  "He who is afraid of asking is ashamed of learning.",
  "Obstacles are what appear when you take your eyes off your dreams.",
  "If we always look back, we lose sight of what's ahead.",
  "Success based on anything but internal fulfillment is bound to be empty.",
  "Do not wait for ideal circumstances, nor for the best opportunities; they will never come.",
  "Triumph often is nearest when defeat seems inescapable.",
  "An error gracefully acknowledged is a victory won.",
  "The courage to be is the courage to accept oneself, in spite of being unacceptable.",
  "Confidence imparts a wonderful inspiration to its possessor.",
  "The universe is full of magical things, patiently waiting for our wits to grow sharper.",
  "The death of fear is in doing what you fear to do.",
  "When we place blame, we give away our power.",
  "What really matters is what you do with what you have.",
  "Happiness does not depend on outward things, but on the way we see them.",
  "Your self-beliefs either support or undermine you.",
  "The greatest mistake you can make in life is to be continually fearing you will make one.",
  "While we may not be able to control all that happens to us, we can control what happens inside us.",
  "Draw from others the lesson that may profit yourself.",
  "Living a life of integrity is one of the greatest missions we can undertake.",
  "Life does not happen to us, it happens from us.",
  "What concerns me is not the way things are, but rather the way people think things are.",
  "No one can make you feel inferior without your consent.",
  "Where there is no vision, the people perish.",
  "They are able because they think they are able.",
  "Whatever we leave to God, God does and blesses us.",
  "Therefore do not worry about tomorrow, for tomorrow will worry about its own things. Sufficient for the day is its own trouble.",
  "Growth and change are never easy...If it were easy, you would have done it long ago.",
  "Repeat anything long enough and it will start to become you.",
  "Great minds have purpose, others have wishes.",
  "There is no security on this earth; there is only opportunity.",
  "The first step towards success in any occupation is to become interested in it.",
  "Ultimately we know deeply that the other side of every fear is a freedom.",
  "Man is a goal-seeking animal. His life only has meaning if he is reaching out and striving for his goals.",
  "Human beings can alter their lives by altering their attitudes of mind.",
  "We cannot always build the future for our youth, but we can build our youth for the future.",
  "Follow your instincts. That's where true wisdom manifests itself.",
  "Opportunity does not knock; it presents itself when you beat down the door.",
  "Waste not fresh tears over old grieves..",
  "Don't try to be great at all things. Pick a few things to be good at and be the best you can.",
  "The universe is completely balanced and in perfect order. You will always be compensated for everything that you do.",
  "It has been my observation that most people get ahead during the time that others waste time.",
  "Aim above morality. Be not simply good for something..",
  "There is true courage in the acts of every day living.",
  "The only real limitation on your abilities is the level of your desires. If you want it badly enough, there are no limits on what you can achieve..",
  "Rarely taught and infrequently practiced, listening is nonetheless a key to communicating and making others feel special.",
  "He who would learn to fly one day must first learn to stand and walk and run and climb and dance; one cannot fly into flying..",
  "The act of taking the first step is what separates the winners from the losers..",
  "Confidence is contagious. So is lack of confidence..",
  "There are three ingredients in the good life: learning, earning and yearning.",
  "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face..",
  "The ultimate measure of a man is not where he stands in moments of comfort, but where he stands at times of challenge and controversy..",
  "The right to be heard does not automatically include the right to be taken seriously..",
  "One's dignity may be assaulted, vandalized and cruelly mocked, but cannot be taken away unless it is surrendered.",
  "Confidence is a habit that can be developed by acting as if you already had the confidence you desire to have..",
  "The fault is not in the stars, but in ourselves..",
  "The act of taking the first step is what separates the winners from the losers..",
  "What light is to the eyes, what air is to the lungs, what love is to the heart, liberty is to the soul of man..",

  "Dream no small dreams for they have no power to move the hearts. .",
  "A clear vision, backed by definite plans, gives you a tremendous feeling of confidence and personal power..",
  "When wealth is lost, nothing is lost; when health is lost, something is lost; when character is lost, all is lost.",
  "I am careful not to confuse excellence with perfection. Excellence, I can reach for; perfection is God's business.",
  "Shoot for the moon. Even if you miss it, you will land among the stars.",
  "Each time you decide to grow again, you realize you're starting at the bottom of another ladder..",
  "When you feel passion, work and play are the same. When you love what you do, you work harder and produce more results than ever before.",
  "Don't limit investing to the financial world. Invest something of yourself, and you will be richly rewarded.",
  "People forget how fast you did a job. - but they remember how well you did it..",
  "When your work is your Hobby, you never have to work a day in your life..",
  "For every result there is a cost..",
  "It has been said that success only shows up when determination does... but it must be powered by a non-negotiable decision.",
  "Great ideas need landing gear as well as wings..",
  "Putting off an easy thing makes it hard. Putting off a hard thing makes it impossible..",
  "The reason why worry kills more people than work is that more people worry than work..",
  "Having conceived of his purpose, a man should mentally mark out a straight pathway to its achievement, looking neither to the right nor the left.",
  "I used to say, 'I sure hope things will change.' Then I learned that the only way things are going to change for me is when I change.",
  "If you don't make a total commitment to whatever you're doing, then start to bail out the first time the boat starts leaking..",
  "Excellent service is not what you believe it to be, it's what your customer perceives it to be. And tells others.",
  "At first our dreams seem impossible, then they seem improbable, but when we summon the will, they become inevitable..",
  "The things that I found easy to do, others found easy not to do.",
  "I know the price of success: dedication, hard work and an unremitting devotion to the things you want to see happen.",
  "Writing is the gold standard of communication. Learn to do it well and see more gold.",
  "The will to believe is perhaps the most powerful, but certainly the most dangerous, human attribute..",
  "Would that I could stand on a busy corner, hat in hand, and beg people to throw me all their wasted hours.",
  "Happiness is not something you postpone for the future; it is something you design for the present.",
  "Time management is a vehicle to take you from wherever you are to wherever you want to go.",
  "Time is amazing... it has only one thing to say to anyone... When?,",
  "Nothing great has ever been achieved except by those who dared believe",
  "something inside them was superior to circumstances.",
  "There's a wonder in the way we're always free; to change the world by changing how we see.",
  "The antidote to worry is purposeful action.",
  "As the ostrich when pursued hideth his head, but forgetteth his body; so the fears of a coward expose him to danger.",
  "You Can, When You believe You Can. Max Steingart Success is a state of mind..",
  "If you want to be successful, start thinking of yourself as being successful.",
  "You are what you believe yourself to be..",
  "Don't be afraid of what life has to offer you. If you believe that life is worth living, your belief will help create the fact..",
  "The barrier between you and success does not exists in the real world. It is simply composed of doubts about your ability..",
  "Your only limits to your realization of tomorrow will be your doubts of today.",
  "Live not as though there were a thousand years ahead of you. Fate is at your elbow; make yourself good while life and power are still yours..",
  "Learning to write and speak before an audience. Nothing in life is more important than the ability to communicate effectively.",
  "If 50 million people say a foolish thing, it is still a foolish thing..",
  "Obstacles cannot crush me; every obstacle yields to stern resolve.",
  "The only way to live is to accept each minute as an unrepeatable miracle, which is exactly what it is - a miracle and unrepeatable.",
  "Our doubts are traitors, and make us lose the good we oft might win by fearing to attempt..",
  "A single person who lacks commitment can be a major source of problems in your organization.",
  "A wise man will make more opportunities then he finds.",
  "Never grow a wishbone where your backbone ought to be..",
  "The first great gift we can bestow on others is a good example..",
  "Things unattended fester. Hearsay happens. Intentions become suspect. The faster you broach the subject, the less infected the wounds..",
  "None are so empty as those who are full of themselves.",
  "One stumble is enough to deface the character of an honorable life.",
  "Be absolutely clear about who you are and what you stand for. Refuse to compromise.",
  "Whenever you do a thing, act as if all the world were watching.",
  "Nothing else can quite substitute for a few well chosen, well timed, sincere words of praise. They're absolutely free and worth a fortune.",
  "Nothing is ever lost by courtesy. It is the cheapest of pleasures, costs nothing, and conveys much.",
  "Kindness is the language which the deaf can hear and the blind can see.",
  "Never esteem men on account of their riches or their station. Respect goodness; find it where you may.",
  "All growth is a leap in the dark, a spontaneous, unpremeditated act without benefit of experience.",
  "Luck is predictable; the harder you work, the luckier you get.",
  "To travel hopefully is a better thing than to arrive, and the true success is to labor.",
  "A positive attitude won't let you do anything. But it will let you do everything better than a negative attitude will.",
  "Always be happy, never be satisfied.",
  "A positive attitude can really make dreams come true-it did for me.",

  "They work in business too.",
  "For a company's advertising strategy to work, it has to be handled not only corporately, but also individually.",
  "Target the Heart of Your Customer, not his Wallet.",
  "He who labors diligently need never despair; for all things are accomplished by diligence and labor.",
  "The past cannot be changed. The future is yet in your power.",
  "We don't receive wisdom; we must discover it for ourselves after a journey that no one can take for us or spare us..",
  "The true measure of a man is how he treats someone who does him absolutely no good..",
  "Don't carry a grudge. While you're carrying the grudge, the other guy's out dancing..",
  "Leadership is practiced not so much in words as in attitude and in actions.",
  "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face..",
  "When I've heard all I need to make a decision, I don't take a vote. I make a decision..",
  "Doing what you love is the cornerstone of having abundance in your life..",
  "One player practicing sportsmanship is far better than 50 preaching it..",
  "I do not believe in a fate that falls on men however they act, but I do believe in a fate that falls on men unless they act.",

  "Leadership is a potent combination of strategy and character. But if you must be without one, be without strategy..",
  "The greatest thing in this world is not so much where we are, but in which direction we are moving.",

  "I want this team to win; I'm obsessed with winning, with discipline, with achieving. That's what this country's all about..",
  "The price of excellence is discipline; the cost of mediocrity is disappointment.",
  "The greatest good you can do for another is not just to share your riches, but to reveal to him his own..",
  "The universe is completely balanced and in perfect order. You will always be compensated for everything that you do.",
  "New knowledge is of little value if it doesn't change us, make us better individuals, and help us to be more productive, happy, and useful..",
  "The greatest good you can do for another is not just to share your riches, but to reveal to him his own.",
  "Don't try to be great at all things. Pick a few things to be good at and be the best you can.",
  "My father taught me to do more than you get paid for as an investment in your future..",
  "The state of your life is nothing more than a reflection of your state of mind..",
  "Nearly all men can stand adversity, but if you want to test a man's character, give him power.",
  "Discipline isn't on your back needling you with imperatives. It is at your side encouraging you with incentives.",
  "A man is a success if he gets up in the morning and gets to bed at night, and in between he does what he wants to do..",
  "Achievement - seems to be connected with action. Successful men and women keep moving. They make mistakes, but they don't quit..",
  "Victory belongs to the most persevering..",
  "The definition of insanity is doing the same thing over and over again and expecting a different result.",
  "Concentration is the secret of strength in politics, in war, in trade, in short in all management of human affairs..",
  "Since most of us spend our lives doing ordinary tasks, the most important thing is to carry them out extraordinarily well.",
  "The will to win is important, but the will to prepare is vital..",
  "The most important thing to do is set goals. Training is a waste of time if you don't have goals.",
  "By working faithfully eight hours a day, you may eventually get to be boss and work 12 hours a day.",
  "Formal education will make you a living; self education will make you a fortune.",
  "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face..",
  "Your own mind is a sacred enclosure into which nothing harmful can enter except by your promotion..",
  "I believe that every right implies a responsibility; every opportunity, an obligation; every possession, a duty..",
  "Some people have learned to earn well, but they haven't learned to live well.",
  "Truth is a hard master and costly to serve, but it simplifies all problems..",
  "When you feel passion, work and play are the same. When you love what you do, you work harder and produce more results than ever before..",
  "The successful person makes a habit of doing what the failing person doesn't like to do.",
  "When I have finally decided that a result is worth getting, I go ahead on it and make trial after trial until it comes..",
  "You can have brilliant ideas, but if you can't get them across, your ideas won't get you anywhere..",
  "If you want a kinder world, then behave with kindness; if you want a peaceful world, make peace within.",
  "Cherish your visions and your dreams, as they are the children of your soul, the blueprints of your ultimate achievements.",
  "The most important persuasion tool you have in your entire arsenal is integrity.",
  "Labor to keep alive in your breast that little spark of celestial fire called conscience.",
  "When wealth is lost, nothing is lost; when health is lost, something is lost; when character is lost, all is lost.",
  "I am careful not to confuse excellence with perfection. Excellence, I can reach for; perfection is God's business.",
  "Everyone has the capacity to be excellent at something.",
  "It has been said that success only shows up when determination does... but it must be powered by a non-negotiable decision.",
  "For every result there is a cost.",
  "Look for the good in every person and every situation. You'll almost always find it.",
  "A man is a success if he gets up in the morning and gets to bed at night, and in between he does what he wants to do.",
  "If you do the things you fear, the fear will die..",
  "If your work is your Hobby, you never have to work a day in your life..",
  "Indecision is the thief of opportunity.",
  "The will to believe is perhaps the most powerful, but certainly the most dangerous, human attribute..",
  "Would that I could stand on a busy corner, hat in hand, and beg people to throw me all their wasted hours.",
  "Happiness is not something you postpone for the future; it is something you design for the present.",
  "The right to be heard does not automatically include the right to be taken seriously..",
  "We grow neither better nor worse as we get old, but more like ourselves.",
  "The young feel tired at the end of an action, the old at the beginning.",
  "Old age is when you know all the answers, but nobody asks you the questions.",
  "Reading is to the mind what exercise is to the body.",
  "It is easier to make money than to save it. One is exertion; the other, self- denial..",
  "Whoever undertakes to set himself up as a judge of truth and knowledge is shipwrecked by the laughter of the gods.",
  "One head cannot hold all wisdom",
  "The only people who never fail are those who never try.",
  "Failure is just another way to learn how to do something right.",
  "I failed my way to success.",
  "Every failure brings with it the seed of an equivalent success.",
  "Only those who dare to fail greatly can ever achieve greatly.",
  "It is hard to fail, but it is worse never to have tried to succeed.",
  "Imagination is more important than knowledge.",
  "Hold fast to dreams, for if dreams die, life is a broken winged bird that cannot fly.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Go confid ently in the direction of your dreams. Live the life you have imagined.",
  "You cannot depend on your eyes when your imagination is out of focus.",
  "Commitment leads to action. Action brings your dream closer.",
  "Do not anticipate trouble or worry about what may never happen. Keep in the sunlight.",
  "Take time to deliberate; but when the time for action arrives, stop thinking and go in.",
  "The mind that is anxious about future events is miserable.",
  "Live in each season as it passes; breathe the air, drink the drink, taste the fruit, and resign yourself to the influences of each.",
  "The art of leadership is saying no, not yes. It is very easy to say yes.",
  "A leader is a dealer in hope.",
  "While a good leader sustains momentum, a great leader increases it.",
  "A general is just as good or just as bad as the troops under his command make him.",
  "To do great things is difficult; but to command great things is more difficult.",
  "Leadership does not always wear the harness of compromise.",
  "Business opportunities are like buses, there's always another one coming.",
  "I avoid looking forward or backward, and try to keep looking upward.",
  "The more difficulties one has to encounter, within and without, the more significant and the higher in inspiration his life will be.",
  "Every artist was first an amateur.",
  "I was always looking outside myself for strength and confidence, but it comes by within. It is there all of the time.",
  "We can do anything we want to do if we stick to it long enough.",
  "Our business in life is not to get ahead of others, but to get ahead of ourselves.",
  "Insist on yourself. Never imitate.",
  "Who looks outside, dreams. Who looks inside, awakes.",
  "It is not easy to find happiness in ourselves, and it is not possible to find it elsewhere.",
  "The only journey is the one within.",
  "Follow your honest convictions, and stay strong.",
  "The happiness of your life depends upon the quality of your thoughts; therefore guard accordingly.",
  "Action may not always bring happiness; but there is no happiness without action.",
  "Happiness depends more on the inward disposition of mind than on outward circumstances.",
  "There is no happiness except in the realization that we have accomplished something.",
  "Happiness is not a goal, but a by-product.",
  "Happiness is not a state to arrive at, but a manner of traveling.",
  "Purpose is what gives life a meaning.",
  "The significance of a man is not in what he attains but in what he longs to attain.",
  "In all things that you do, consider the end.",
  "Life can be pulled by goals just as surely as it can be pushed by drives.",
  "The virtue lies in the struggle, not in the prize.",
  "To reach a port, we must sail",
  "Success is the child of audacity.",
  "The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack in will.",
  "The secret of success is to know something nobody else knows.",
  "The surest way not to fail is to determine to succeed.",
  "I cannot give you the formula for success, but I can give you the formula for failure which is: Try to please everybody.",
  "Careful thinking and hard work will solve nearly all your problems. Try and see for yourself.",
  "Years teach us more than books.",
  "The only medicine for suffering, crime, and all the other woes of mankind, is wisdom.",
  "The art of being wise is knowing what to overlook.",
  "The great lesson is that the sacred is in the ordinary, that it is to be found in ones daily life, in ones neighbors, friends and family, in ones backyard.",
  "A wise man learns by the mistakes of others, a fool by his own.",
  "No man was ever wise by chance.",
  "In everything the ends well defined are the secret of durable success.",
  "Arriving at one goal is the starting point to another.",
  "A goal is a dream with a deadline.",
  "Most impossible goals can be met simply by breaking them down into bite-size chunks, writing them down, believing them, and then going full speed ahead as if they were routine.",
  "Goals are the fuel in the furnace of achievement.",
  "We are what we repeatedly do. Excellence, therefore, is not an act but a habit.",
  "Take risks and you'll get the payoffs. Learn by your mistakes until you succeed. It's that simple.",
  "The best way out is always through.",
  "You miss 100 percent of the shots you don't take.",
  "Nothing will ever be attempted if all possible objections must first be overcome.",
  "Don't bunt. Aim out of the ballpark.",
  "The critical ingredient is getting off your butt and doing something. It\'s as simple as that. A lot of people have ideas, but there are few who decide to do something about them now. Not tomorrow. Not next week. But today. The true entrepreneur is a doer, not a dreamer.",
  "Your most unhappy customers are your greatest source of learning.",
  "I have not failed. I\'ve just found 10,000 ways that won\'t work.",
  "Entrepreneurship is neither a science nor an art. It is a practice.",
  "In the modern world of business, it is useless to be a creative, original thinker unless you can also sell what you create.",
  "Success is how high you bounce after you hit bottom.",
  "If you\'re not embarrassed by the first version of your product, you\'ve launched too late.",
  "Positive thinking will let you do everything better than negative thinking will.",
  "I\'m not afraid of dying, I\'m afraid of not trying.",
  "Whatever the mind can conceive and believe, the mind can achieve.",
  "The longer you\'re not taking action the more money you\'re losing",
  "If you live for weekends or vacations, your shit is broken",
  "Go Big, or Go Home",
  "Most great people have attained their greatest success just one step beyond their greatest failure",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work",
  "Have the end in mind and every day make sure your working towards it",
  "He who begins many things finishes but few",
  "The best use of life is to spend it for something that outlasts it",
  "If you think education is expensive, try ignorance",
  "Entrepreneurship is living a few years of your life like most people wont so you can spend the rest of your life like most people can\'t",
  "Lend your friend $20, if he doesn\'t pay you back then he\'s not your friend. Money well spent",
  "Be nice to geek\'s, you\'ll probably end up working for one",
  "To never forget that the most important thing in life is the quality of life we lead",
  "Its better to own the racecourse then the race horse",
  "When you go to buy, don\'t show your silver",
  "It\'s easier to ask forgiveness than it is to get permission",
  "To win without risk is to triumph without glory",
  "Example is not the main thing in influencing other people; it\'s the only thing",
  "Associate yourself with people of good quality, for it is better to be alone than in bad company",
  "Keep away by people who try to belittle your ambitions. Small people always do that, but the really great make you feel that you, too, can become great",
  "There is only one success",
  "You don\'t buy a nice car and get rich you get rich and buy a nice car",
  "Fall seven times, stand up eight",
  "One day your life will flash before your eyes. Make sure it is worth watching",
  "Whatever the mind can conceive and believe, the mind can achieve",
  "I have not failed. I\'ve just found 10,000 ways that won\'t work",
  "If you ain\'t making waves, you ain\'t kickin\' hard enough",
  "What is not started will never get finished",
  "Do not wait to strike until the iron is hot; but make it hot by striking",
  "When you cease to dream you cease to live",
  "There are two rules for success. 1) Never tell everything you know.",
  "The only place where success comes before work is in the dictionary.",
  "Every single person I know who is successful at what they do is successful because they love doing it.",
  "Being realistic is the most commonly traveled road to mediocrity.",
  "Whenever an individual or a business decides that success has been attained, progress stops.",
  "To be successful, you have to have your heart in your business, and your business in your heart.",
  "If hard work is the key to success, most people would rather pick the lock.",
  "Success is simply a matter of luck. Ask any failure.",
  "The road to success is always under construction.",
  "Anything the mind can conceive and believe, it can achieve.",
  "Most great people have attained their greatest success just one step beyond their greatest failure.",
  "Whether you think you can or you can\'t, you\'re right.",
  "Failure defeats losers, failure inspires winners.",
  "I have not failed. I\'ve just found 10,000 ways that won\'t work.",
  "The biggest failure you can have in life is not trying at all.",
  "I honestly think it is better to be a failure at something you love than to be a success at something you hate.",
  "Leaders don\'t force people to follow, they invite them on a journey.",
  "Example is not the main thing in influencing other people; it\'s the only thing.",
  "Leadership is doing what is right when no one is watching.",
  "Leadership is the art of getting someone else to do something you want done because he wants to do it.",
  "The difference between a boss and a leader: a boss says, \'Go!\' -a leader says, \'Let\'s go!\'.",
  "I am more afraid of an army of one hundred sheep led by a lion than an army of one hundred lions led by a sheep.",
  "The whole problem with the world is that fools and fanatics are always so certain of themselves, but wiser people so full of doubts.",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  "Cannibals prefer those who have no spines.",
  "A ship in harbor is safe. But that\'s now what ships are built for.",
  "If one does not know to which port one is sailing, no wind is favorable.",
  "You miss 100% of the shots you don\'t take.",
  "I\'m not a businessman. I\'m a business, man.",
  "The vision must be followed by the venture. It is not enough to stare up the steps - we must step up the stairs.",
  "Do not wait to strike until the iron is hot; but make it hot by striking.",
  "It\'s easier to ask forgiveness than it is to get permission.",
  "Twenty years by now you will be more disappointed by the things that you didn\'t do than by the ones you did do.",
  "One day your life will flash before your eyes. Make sure it is worth watching.",
  "I think it\'s wrong that only one company makes the game Monopoly.",
  "Ever notice how it\'s a penny for your thoughts, yet you put in your two-cents? Someone is making a penny on the deal.",
  "Catch a man a fish, and you can sell it to him. Teach a man to fish, and you ruin a wonderful business opportunity.",
  "I used to sell furniture for a living. The trouble was, it was my own.",
  "Marking dynamos for repair $10,000.00-2 hours labor $10.00; knowing where to mark $9,990.00.",
  "By working faithfully eight hours a day you may eventually get to be boss and work twelve hours a day.",
  "My son is now an \'entrepreneur\'. That\'s what you\'re called when you don\'t have a job.",
  "I didn\'t go to college, but if I did, I would\'ve taken all my tests at a restaurant, \'cause \'The customer is always right.\'",
  "Formal education will make you a living. Self education will make you a fortune.",
  "The greatest reward in becoming a millionaire is not the amount of money that you earn. It is the kind of person that you have to become to become a millionaire in the first place.",
  "If you\'re not learning while you\'re earning, you\'re cheating yourself out of the better portion of your compensation.",
  "A business that makes nothing but money is a poor business.",
  "After a certain point, money is meaningless. It ceases to be the goal. The game is what counts.",
  "I treat business a bit like a computer game. I count money as points. I\'m doing really well: making lots of money and lots of points.",
  "All of my friends were doing babysitting jobs. I wanted money without the job.",
  "I don\'t pay good wages because I have a lot of money; I have a lot of money because I pay good wages.",
  "Lend your friend $20. If he doesn\'t pay you back then he\'s not your friend. Money well spent.",
  "Money and success don\'t change people; they merely amplify what is already there.",
  "The secret of getting ahead is getting started.",
  "Hire character. Train skill.",
  "In preparing for battle I have always found that plans are useless, but planning is indispensable.",
  "You\'ve got to stop doing all the things that people have tried, tested, and found out don\'t work.",
  "I never perfected an invention that I did not think about in terms of the service it might give others... I find out what the world needs, then I proceed to invent.",
  "If you\'re not making mistakes, then you\'re not making decisions.",
  "Your most unhappy customers are your greatest source of learning.",
  "One can get anything if he is willing to help enough others get what they want.",
  "An entrepreneur tends to bite off a little more than he can chew hoping he\'ll quickly learn how to chew it.",
  "The true entrepreneur is a doer, not a dreamer.",
  "Whenever you are asked if you can do a job, tell \'em, \'Certainly, I can!\' Then get busy and find out how to do it.",
  "Everything started as nothing.",
  "If you start with nothing and end up with nothing, there\'s nothing lost.",
  "Start today, not tomorrow. If anything, you should have started yesterday.",
  "Make it happen now, not tomorrow. Tomorrow is a loser\'s excuse.",
  "Every day I get up and look through the Forbes list of the richest people in America. If I\'m not there, I go to work.",
  "Entrepreneurship is living a few years of your life like most people won\'t, so that you can spend the rest of your life like most people can\'t.",
  "Yesterday\'s home runs don\'t win today\'s games.",
  "You should always stay hungry. Stay hungry, so you can eat.",
  "If you\'re not living life on the edge, you\'re taking up too much space.",
  "I wasn\'t satisfied just to earn a good living. I was looking to make a statement.",
  "Opportunity is missed by most people because it is dressed in overalls and looks like work.",
  "You must either modify your dreams or magnify your skills.",
  "Keep away by people who try to belittle your ambitions. Small people always do that, but the really great make you feel that you, too, can become great.",
  "Not a single person whose name is worth remembering lived a life of ease.",
  "If you think that you are going to love something, give it a try. You\'re going to kick yourself in the butt for the rest of your life if you don\'t.",
  "The best time to plant a tree is twenty years ago. The second best time is now.",
  "If you want one year of prosperity, grow grain. If you want ten years of prosperity, grow trees. If you want one hundred years of prosperity, grow people.",
  "Vision without action is a daydream. Action without vision is a nightmare.",
  "Sow a thought, reap an action; sow an action, reap a habit; sow a habit, reap a character; sow a character, reap a destiny.",
  "A bad workman blames his tools.",
  "A fall into a ditch makes you wiser.",
  "Defeat isn\'t bitter if you don\'t swallow it.",
  "The diamond cannot be polished without friction, nor the man perfected without trials.",
  "A jade stone is useless before it is processed; a man is good-for-nothing until he is educated.",
  "A journey of a thousand miles begins with a single step.",
  "The loftiest towers rise by the ground.",
  "Building a castle is difficult. Defending and maintaining it is harder still.",
  "A person who says it cannot be done should not interrupt the man doing it.",
  "All cats love fish but fear to wet their paws.",
  "Don\'t stand by the water and long for fish; go home and weave a net.",
  "Everyone should carefully observe which way his heart draws him, and then choose that way with all his strength.",
  "Failing to plan is planning to fail.",
  "If you pay peanuts, you get monkeys.",
  "Make happy those who are near, and those who are far will come.",
  "Teachers open the door. You enter by yourself.",
  "Find a job you love and you\'ll never work a day in your life.",
  "The entrepreneur builds an enterprise; the technician builds a job.",
  "If you want to be inventive",
  "The challenge is not just to build a company that can endure; but to build one that is worthy of enduring.",
  "Success is a lousy teacher. It seduces smart people into thinking they can\'t lose.",
  "Don\'t treat your customers like a bunch of purses and wallets.",
  "Nine out of ten businesses fail; so I came up with a foolproof plan",
  "We make a living by what we get. But we make a life by what we give.",
  "Believe that you will succeed",
  "Victory comes only after many struggles and countless defeats.",
  "As long as you\'re going to be thinking anyway, think big.",
  "Success is how high you bounce after you hit bottom",
  "Remembering you are going to die is the best way I know to avoid the trap of thinking you have something to lose.",
  "It\'s not about how to get started; its about how to get noticed.",
  "A ship in harbor is safe, but that\'s not what ships are for.",
  "If I find 10,000 ways something won\'t work, I haven\'t failed. I am not discouraged, because every wrong attempt discarded is often a step forward.",
  "Business opportunities are like buses, there\'s always another one coming.",
  "If we don\'t allow ourselves to make mistakes, we will never invest in things that are radical.",
  "The critical ingredient is getting off your butt and doing something.",
  "Nothing will work unless you do.",
  "Try not to be a man of success, but rather try to become a man of value.",
  "You won\'t get anything unless you have the vision to imagine it.",
  "A man must be big enough to admit his mistakes, smart enough to profit by them, and strong enough to correct them.",
  "In the modern world of business, it is useless to be a creative, original thinker unless you can also sell what you create.",
  "Success is doing what you want, where you want, when you want, with whom you want as much as you want.",
  "If you don\'t have a competitive advantage",
  "You were born to win, but to be a winner, you must plan to win, prepare to win, and expect to win.",
  "If everything seems under control, you\'re just not going fast enough.",
  "Do or do not. There is no try.",
  "Show me a person who never made a mistake, and I will show you a person who never did anything.",
  "ideas are commodity. Execution of them is not.",
  "User experience is everything. It always has been, but it\'s undervalued and underinvested in. If you don\'t know user-centered design, study it. Hire people who know it. Obsess over it. Live and breathe it. Get your whole company on board.",
  "A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.",
  "The man who does not work for the love of work but only for money is likely to neither make money nor find much fun in life.",
  "Be undeniably good. No marketing effort or social media buzzword can be a substitute for that.",
  "ideas are easy. Implementation is hard.",
  "You can say anything to anyone, but how you say it will determine how they will react.",
  "Always deliver more than expected.",
  "Assume you have 90 seconds with a new user before they decide to use your app or delete it.",
  "Even if you don\'t have the perfect idea to begin with, you can likely adapt.",
  "Make your team feel respected, empowered and genuinely excited about the company\'s mission.",
  "Stay self-funded as long as possible.",
  "In between goals is a thing called life, that has to be lived and enjoyed.",
  "Wonder what your customer really wants? Ask. Don\'t tell.",
  "When times are bad is when the real entrepreneurs emerge.",
  "What do you need to start a business? Three simple things: know your product better than anyone, know your customer, and have a burning desire to succeed.",
  "Get big quietly, so you don\'t tip off potential competitors.",
  "Don\'t worry about failure; you only have to be right once.",
  "Don\'t be cocky. Don\'t be flashy. There\'s always someone better than you.",
  "Don\'t take too much advice. Most people who have a lot of advice to give - with a few exceptions - generalize whatever they did. Don\'t over-analyze everything. I myself have been guilty of over-thinking problems. Just build things and find out if they work.",
  "Openly share and talk to people about your idea. Use their lack of interest or doubt to fuel your motivation to make it happen.",
  "How you climb a mountain is more important than reaching the top.",
  "Associate yourself with people of good quality, for it is better to be alone than in bad company.",
  "It\'s fine to celebrate success but it is more important to heed the lessons of failure.",
  "It takes 20 years to build a reputation and five minutes to ruin it. If you think about that, you\'ll do things differently.",
  "Statistics suggest that when customers complain, business owners and managers ought to get excited about it. The complaining customer represents a huge opportunity for more business.",
  "There is only one success- to be able to spend your life in your own way.",
  "Formal education will make you a living; self-education will make you a fortune.",
  "When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.",
  "Rarely have I seen a situation where doing less than the other guy is a good strategy.",
  "You miss 100 percent of the shots you don\'t take.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "The secret to successful hiring is this: look for the people who want to change the world.",
  "Twenty years by now, you will be more disappointed by the things that you didn\'t do than by the ones you did do, so throw off the bowlines, sail away by safe harbor, catch the trade winds in your sails. Explore, Dream, Discover.",
  "If you\'ve got an idea, start today. There\'s no better time than now to get going. That doesn\'t mean quit your job and jump into your idea 100% by day one, but there\'s always small progress that can be made to start the movement.",
  "It\'s almost always harder to raise capital than you thought it would be, and it always takes longer. So plan for that.",
  "I don\'t have big ideas. I sometimes have small ideas, which seem to work out.",
  "Fail often so you can succeed sooner.",
  "When you cease to dream you cease to live.",
  "Whatever the mind can conceive and believe, the mind can achieve.",
  "Running a start-up is like eating glass. You just start to like the taste of your own blood.",
  "My number one piece of advice is: you should learn how to program.",
  "The way to get started is to quit talking and begin doing.",
  "Building and hanging on to an audience is the biggest role of social media.",
  "Every feature has some maintenance cost, and having fewer features lets us focus on the ones we care about and make sure they work very well.",
  "A poorly implemented feature hurts more than not having it at all.",
  "the entrepreneur always searches for change, responds to it, and exploits it as an opportunity.",
  "You don\'t learn to walk by following rules. You learn by doing and falling over.",
  "The fastest way to change yourself is to hang out with people who are already the way you want to be.",
  "Risk more than others think is safe. Dream more than others think is practical.",
  "You shouldn\'t focus on why you can\'t do something, which is what most people do. You should focus on why perhaps you can, and be one of the exceptions.",
  "The critical ingredient is getting off your butt and doing something. It\'s as simple as that. A lot of people have ideas, but there are few who decide to do something about them now. Not tomorrow. Not next week. But today. The true entrepreneur is a doer not a dreamer.",
  "If you cannot do great things, do small things in a great way.",
  "Success is not what you have, but who you are.",
  "One of the huge mistakes people make is that they try to force an interest on themselves. You don\'t choose your passions; your passions choose you.",
  "Lots of companies don\'t succeed over time. What do they fundamentally do wrong? They usually miss the future.",
  "It takes humility to realize that we don\'t know everything, not to rest on our laurels and know that we must keep learning and observing. If we don\'t, we can be sure some startup will be there to take our place.",
  "There\'s an entrepreneur right now, scared to death, making excuses, saying, \'It\'s not the right time just yet.\' There\'s no such thing as a good time. Get out of your garage and go take a chance, and start your business.",
  "Be really picky with your hiring, and hire the absolute best people you possibly can. People are the most important component of almost every business, and attracting the best talent possible is going to make a huge difference.",
  "Worry about being better; bigger will take care of itself. Think one customer at a time and take care of each one the best way you can.",
  "You have a viable business only if your product is either better or cheaper than the alternatives. If it\'s not one or the other, you might make some money at first, but it\'s not a sustainable business.",
  "Every time I took these bigger risks, the opportunity for a bigger payout was always there.",
  "If you can do something to get somebody excited - not everybody - but if you can be the best for somebody, then you can win.",
  "Would you like me to give you a formula for success? It\'s quite simple, really: Double your rate of failure. You are thinking of failure as the enemy of success. But it isn\'t at all. You can be discouraged by failure or you can learn by it, so go ahead and make mistakes. Make all you can. Because remember that\'s where you will find success.",
  "People who succeed have momentum. The more they succeed, the more they want to succeed, and the more they find a way to succeed. Similarly, when someone is failing, the tendency is to get on a downward spiral that can even become a self-fulfilling prophecy.",
  "The only limit to our realization of tomorrow will be our doubts of today.",
  "The successful warrior is the average man, with laser-like focus.",
  "Fall seven times and stand up eight.",
  "The successful man is the one who finds out what is the matter with his business before his competitors do.",
  "There\'s no shortage of remarkable ideas, what\'s missing is the will to execute them.",
  "Keep on going, and the chances are that you will stumble on something, perhaps when you are least expecting it. I never heard of anyone ever stumbling on something sitting down.",
  "A successful man is one who can lay a firm foundation with the bricks others have thrown at him.",
  "Everyone is a genius. But if you judge a fish by its ability to climb a tree, it will spend its whole life believing it is stupid.",
  "Success in business requires training and discipline and hard work. But if you\'re not frightened by these things, the opportunities are just as great today as they ever were.",
  "It is never too late to be what you might have been.",
  "I am not a product of my circumstances. I am a product of my decisions.",
  "There is only one way to avoid criticism: Do nothing, say nothing, and be nothing.",
  "Build your own dreams, or someone else will hire you to build theirs.",
  "You may be disappointed if you fail, but you are doomed if you don\'t try.",
  "I learned not to worry so much about the outcome, but to concentrate on the step I was on and to try to do it as perfectly as I could when I was doing it.",
  "One day you\'ll wake up and there won\'t be any more time to do the things you\'ve always wanted. Do it now.",
  "If you're pursuing a goal you know you can do, it's the wrong goal.",
  "Don\'t be afraid of losing, be afraid of playing a game and not learning something.",
  "We have two lives, and the second begins when we realize we only have one.",
  "And, when you want something, all the universe conspires in helping you to achieve it.",
  "In the long run, what people think about shepherds and bakers becomes more important for them than their own destinies.",
  "If you start out by promising what you don\'t even have yet, you\'ll lose your desire to work toward getting it.",
  "And when each day is the same as the next, it\'s because people fail to recognize the good things that happen in their lives every day that the sun rises.",
  "There was nothing to hold him back except himself.",
  "I\'m not afraid to die without a doubt because I know for a fact that I\'ve lived every single moment I\'ve been here.",
  "Life moves pretty fast. If you don\'t stop and look around once in a while, you could miss it.",
  "You either walk inside your story and own it or you stand outside your story and hustle for your worthiness.",
  "I\'ve missed more than 9000 shots in my career. I\'ve lost almost 300 games. 26 times, I\'ve been trusted to take the game winning shot and missed. I\'ve failed over and over and over again in my life. And that is why I succeed.",
  "The more I want to get something done, the less I call it work.",
  "Logic will get you by A to B. Imagination will take you everywhere.",
  "Your life does not get better by chance. It gets better by change.",
  "If you have dreams it is your responsibility to make them happen.",
  "I think it is often easier to make progress on mega-ambitious dreams. Since no one else is crazy enough to do it, you have little competition. In fact, there are so few people this crazy that I feel like I know them all by first name.",
  "If you don\'t give up, you still have a chance. And when you are small, you have to be very focused and rely on your brain, not your strength.",
  "Effort only fully releases its reward after a person refuses to quit.",
  "Twenty years by now you will be more disappointed by the things that you didn\'t do than by the ones you did do. So throw off the bowlines. Sail away by the safe harbor. Catch the trade winds in your sails. Explore. Dream. Discover.",
  "They built the pyramids without electricity, there was no app for that.",
  "Even if you\'re on the right track, you\'ll get run over if you just sit there.",
  "The best way to not feel hopeless is to get up and do something. Don\'t wait for good things to happen to you. If you go out and make some good things happen, you will fill the world with hope, you will fill yourself with hope.",
  "When you win, say nothing. When you lose, say less.",
  "What I can\'t create, I do not understand.",
  "Keep on going and the chances are you will stumble on something, perhaps when you are least expecting it. I have never heard of anyone stumbling on something sitting down.",
  "The day a product development process starts, it\'s behind schedule and above budget.",
  "In theory, there is no difference between theory and practice. In practice, there is.",
  "Do not let what you cannot do interfere with what you can do.",
  "When something annoys you, it could be because you\'re living in the future... Live in the future and build what seems interesting.",
  "Without passion we might all just be dead.",
  "If you\'re changing the world, you\'re working on important things. You\'re excited to get up in the morning.",
  "Instead of buying your children all the things you never had, you should teach them all the things you were never taught. Material wears out but knowledge stays.",
  "Life is more than just salary",
  "It is easy to sit up and take notice, What is difficult is getting up and taking action.",
  "If you\'re not embarrassed by your old code then you aren\'t progressing as a programmer.",
  "Vision without action is daydream. Action without vision is nightmare.",
  "The real winners in life are the people who look at every situation with an expectation that they can make it work or make it better",
  "If you are born poor, it is not your mistake. But if you die poor it is your mistake.",
  "If I had asked people what they wanted, they would have said faster horses.",
  "Some men see things as they are and say why... I dream things that never were and say why not.",
  "It\'s possible to avoid failure, to always be safe. But that is also the route to a dull, uninteresting life.",
  "Winning is not everything, but the effort to win is.",
  "You make a living by what you earn; you make a life by what you give.",
  "Keep a positive mind. Remember, a failed attempt doesn\'t make you a failure - giving up does.",
  "Don\'t feel good about yourself, feel good about who you could be",
  "The real opportunity for success lies within the person and not in the job.",
  "All our dreams can come true, if we have the courage to pursue them.",
  "Great spirits have always encountered violent opposition by mediocre minds.",
  "When we hit our lowest point, we are open to our greatest change.",
  "You\'ll never know until you try.",
  "There\'s always another way...",
  "If you want a happy ending, that depends, of course, on where you stop your story.",
  "Even if you have a 9 to 6 job, 7 to 2 is still enough time to do some serious damage, stop watching lost.",
  "You don\'t have to be great to start, but you have to start to be great.",
  "May your choices reflect your hopes, not your fears.",
  "Winners don\'t make excuses when the other side plays the game.",
  "If friends you trust, gather around you; hope can take physical form and become visible.",
  "Remove the temptation to settle for anything short of what you deserve.",
  "Use only that which works, and take it by any place you can find",
  "Great dreamers\' dreams are never fulfilled, they are always transcended",
  "Not all those who wander are lost",
  "Writing is nature\'s way of letting you know how sloppy your thinking is",
  "You discover your style when you fail, to be the person you\'re trying to be",
  "I always believe the hardest choices in life are the right ones and the ones that are easy are usually the wrong ones",
  "Everything can work!",
  "Find a purpose in life so big it will challenge every capacity to be at your best.",
  "Regardless of how you feel inside, always try to look like a winner. Even if you are behind, a sustained look of control and confidence can give you a mental edge that results in victory.",
  "The determination to win is the better part of winning.",
  "Luck is a dividend of sweat. The more you sweat, the luckier you get.",
  "Remember that you are very special, no one can play your role better than you.",
  "It isn\'t the mountains ahead to climb that wear you out; it\'s the pebble in your shoe.",
  "The last time doesn\'t exist. It\'s only this time. And everything is going to be different this time. There\'s only now.",
  "There is nothing noble about being superior to some other man. The true nobility is in being superior to your previous self.",
  "There is no one right way. Just figure out what works for you!",
  "Little by little, one travels far.",
  "The man who removes a mountain begins by carrying away small stones...",
  "Sometimes you fall before you rise, Sometimes you lose it all to find, You\'ve gotta keep fighting, And get back up again",
  "Perfection is not attainable, but if we chase perfection we can catch excellence...",
  "Courage is found in unlikely places.",
  "All we\'ve to decide is what to do with the time that is given to us.",
  "If more of us valued food and cheer and song above hoarded gold, it would be a merrier world.",
  "Faithless is he that says farewell when the road darkens.",
  "Still round the corner there may wait, a new road or a secret or gate.",
  "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.",
  "Alcohol is a depressant, so it was putting me in a really bad spot, mentally. I couldn\'t really tour any more if I was going to be depressed and drunk.",
  "I\'m an artist at living - my work of art is my life.",
  "Don\'t do it for the money, but do it because you love music.",
  "Life isn\'t a support system for art, its the other way around",
  "Let us think the unthinkable, let us do the undoable, let us prepare to grapple with the ineffable itself, and see if we may not eff it after all.",
  "Winners lose much more often than losers. So if you keep losing but you\'re still trying, keep it up! You\'re right on track.",
  "Keep on going and the chances are you will stumble on something, perhaps when you are least expecting it. I have never heard of anyone stumbling on something sitting down.",
  "Feeling grateful to or appreciative of someone or something in your life actually attracts more of the things that you appreciate and value into your life.",
  "Each player must accept the cards life deals him or her: but once they are in hand, he or she alone must decide how to play the cards in order to win the game.",
  "A successful man is one who can lay a firm foundation with the bricks that others throw at him.",
  "I always advice people - Don\'t wait ! Do something when you are young, when you have no responsibilities. Invest time in yourself to have great experiences that are going to enrich you, then you can\'t possibly lose.",
  "Once a man has made a commitment to a way of life, he puts the greatest strength in the world behind him. It\'s something we call heart power. Once a man has made his commitment, nothing will stop him short of success.",
  "Only a man who knows what it is like to be defeated can reach down to the bottom of his soul and come up with the extra ounce of power it takes to win when the match is even.",
  "When action grows unprofitable, gather information; when information grows unprofitable, sleep.",
  "Sometimes you climb out of bed in the morning and you think, I\'m not going to make it, but you laugh inside - remembering all the times you\'ve felt that way.",
  "Go confidently in the direction of your dreams. Live the life you\'ve imagined. As you simplify your life, the laws of the universe will be simpler.",
  "You should never view your challenges as a disadvantage. Instead, it\'s important for you to understand that your experience facing and overcoming adversity is actually one of your biggest advantages.",
  "Just enjoy your tea and a cookie. And be nice to the people around you. That\'s all there is. Everything else is just filling time.",
  "The only thing standing between us and a life filled with joy and everything we want is our very own self!",
  "Death exists, not as the opposite but as a part of life.",
  "This is your life, you can be anything...",
  "The most dangerous enemy is that which no one fears.",
  "The goal of terrorism is to create terror and fear. Fear undermines faith in the establishment.",
  "Profound ideas are always obvious once they are understood.",
  "I measure my success by how happy I am, not how big the business is out how much money I\'ve made.",
  "You spend so much time at work, why waste it doing anything other than what you love most? Life is too short for that.",
  "Skills are cheap, passion is priceless.",
  "Never regret your past. Rather embrace it as the teacher that it is.",
  "To stop spending so much time making a living and to spend far more time creating a life.",
  "With one eye fixed on the destination, there is only one left to guide you along the journey.",
  "The moment you concentrate the focus of your mind on a singular purpose, extraordinary gifts will appear within your life.",
  "Find out what you truly love to do and then direct all of your energy towards doing it.",
  "What really separates people who are habitually upbeat and optimistic by those who are consistently miserable is how the circumstances of life are interpreted and processed.",
  "When you form the habit of searching for the positive in every circumstance, your life will move into its highest dimensions.",
  "How can you really know the joy of being on the summit of the mountain unless you\'ve first visited the lowest valley.",
  "As a teenager I made mixtapes for crushes with no interest in my music taste. Now I do talks! Life, uh, finds a way.",
  "Before you can optimize your app you should optimize your workflow, so you have more time to work on your app.",
  "Music, a magic beyond all we do here!",
  "To the well organised mind, death is but the next great adventure.",
  "The trouble is, humans do have a knack of choosing precisely those things which are worst for them.",
  "The best of us must sometimes eat our words.",
  "It is our choices that show what we truly are, far more than our abilities.",
  "What you fear most of all is - fear.",
  "If you want to know what a man\'s like, take a good look at how he treats his inferiors, not his equals.",
  "We\'re only as strong as we\'re united, as weak as we\'re divided.",
  "Greatness inspires envy, envy endangers spite, spite spawns lies.",
  "Age is foolish and forgetful when it underestimates youth.",
  "It is the unknown we fear when we look upon death and darkness, nothing more.",
  "Those who are best suited to power are those who have never sought it.",
  "Sometimes costs are made to be borne.",
  "People linked by destiny will always find each other",
  "I let my playing do the talking",
  "Life is like a camera: just focus on what is important, capture good times, develop by negative, and if things do not work out, take another shot!",
  "Think in terms of opportunities and solutions instead of problems, disappointment, and failure",
  "Do the best you can until you know better. Then when you know better, do better.",
  "Songwriting is a thing we can\'t stop. It\'s a habit, almost.",
  "Everything will be okay in the end. If it\'s not okay, it\'s not the end.",
  "Your fears, your critics, your heroes, your villains: They are fictions you perceive as reality. Choose to see through them. Choose to let them go.",
  "It\'s never been easier to start a company. It\'s never been harder to build one.",
  "You can beat 40 scholars with one fact, but you can\'t beat one idiot with 40 facts.",
  "Most people underestimate what they can do in a year, and overestimate what they can do in a day",
  "Don\'t write to make money, write to build relationships with like minded people that you haven\'t yet met.",
  "When I get sad, I stop being sad and be awesome instead.",
  "All we\'re saying, is give peace a chance.",
  "No amount of indentation or sorting imports alphabetically can fix a broken design.",
  "Stop complaining. Start creating.",
  "Age is an issue of mind over matter. If you don\'t mind, it doesn\'t matter...",
  "Your goal in life is to find out the people who need you the most, to find out the business that needs you the most, to find the project and the art that needs you the most. There is something out there just for you.",
  "Your closest friends are the ones you can have a relationship with about nothing.",
  "I should call my parents when I think of them, should tell my friends when I love them",
  "I wish there was a way to know you\'re in the good old days, before you\'ve actually left them.",
  "Extend beyond your preconceived limits!",
  "Everything is gonna come together and its gonna be beautiful",
  "It isn\'t what you have, or who you are, or where you are, or what you are doing that makes you happy or unhappy. It is what you think about.",
  "Do not be afraid to give up the good for the great.",
  "Say yes to failure and pick the good thoughts.",
  "Failure is guaranteed; 100% you\'re gonna fail. It\'s just a matter of can you string together those failures so that it turns into something called success.",
  "You can't cling to the past, because no matter how hard you hold on, its already gone",
  "Life can only be understood backwards; but it must be lived forwards.",
  "Man is not made for defeat, a man can be destroyed but not defeated",
  "You miss 100% of the shots you don\'t take.",
  "Having a dream is always better than getting there, the journey itself is what makes it beautiful",
  "Reading is faster than listening. Doing is faster than watching.",
  "Become the best in the world at what you do. Keep redefining what you do until this is true.",
  "If you make a mistake, try to do it twice and smile. That way people will think you meant it.",
  "If wisdom could be imparted through words alone, we\'d all be done here.",
  "Inspiration is perishable - act on it immediately.",
  "The price of trying to make everyone else happy is making yourself miserable.",
  "Life is to short to not try to keep getting better",
  "If you work like no one else right now, you'll be able to live like no one else in the future",
  "Telling a programmer there's already a library to do X is like telling a songwriter there's already a song about love.",
]);

phrases = phrases.concat([
  "Todos los días deberíamos oír un poco de música, leer una buena poesía, contemplar un cuadro hermoso y si es posible, decir algunas palabras sensatas.",
  "Juventud no es la del que tiene veinte años. Joven es aquel que se conmueve ante cualquier injusticia en el mundo.",
  "Los jóvenes no sólo deben ser amados, sino que deben notar que se les ama.",
  "El mar dará a cada hombre una nueva esperanza, como el dormir le da sueños.",
  "Brillar es de valientes.",
  "No es lo que decimos o pensamos lo que nos define, es lo que hacemos.",
  "Recibir sin orgullo, desprenderse sin apego.",
  "Al éxito y al fracaso, esos dos impostores, trátalos siempre con la misma indiferencia.",
  "El éxito y el fracaso son dos grandes impostores. Nadie tiene éxito total ni nadie fracasa totalmente.",
  "Las grandes cosas no se hacen por impulso, sino por una serie de pequeñas cosas reunidas.",
  "La ambición sin conocimiento es como un barco en tierra firme.",
  "El triunfo no esta en vencer siempre, sino en nunca desanimarse.",
  "En algún lugar de un libro hay una frase esperándonos para darle un sentido a la existencia.",
  "Es mejor preguntar dos veces que extraviarse una.",
  "Para viajar lejos, no hay mejor nave que un libro.",
  "En el caos busca la simplicidad y en la discordia la armonía.",
  "Comer bien es importante tras una batalla.",
  "Salir es algo que está muy sobrevalorado.",
  "En la vida las raíces son más importantes que las ramas.",
  "El corazón tiene razones que la razón no entiende.",
  "Obstáculos son oportunidades.",
  "Si una persona es perseverante, aunque sea dura de entendimiento, se hará inteligente; y aunque sea débil, se transformará en fuerte.",
  "No puedes guiar el viento, pero puedes cambiar la dirección de tus velas.",
  "El momento que da más miedo es justo antes de empezar.",
  "Los milagros toman tiempo.",
  "Espíritu y agallas.",
  "Un viaje de mil millas comienza con el primer paso.",
  "Todos somos aficionados. La vida es tan corta que no da para más.",
  "La historia decía que era prisionera, pero eso no era cierto, porque ella tenía esperanza y cuando hay esperanza no eres prisionero de nadie.",
  "El norte cardinal es un punto en un mapa. ¿El norte verdadero? Es el hogar.",
  "Mira a tu alrededor... ¡Todos apostamos a tí!",
  "Otras cosas nos cambian, pero empezamos y acabamos con la familia.",
  "La libertad debe ser desorganizada.",
  "La recompensa de una buena acción está en haberla hecho.",
  "Sólo un tiburón conoce a otro tiburón.",
  "A los que dicen no se puede, yo les digo se puede.",
  "Te recuerda que el mundo no fue creado para el hombre, sino que el hombre fue creado para el mundo.",
  "Estudiando lo pasado, se aprende lo nuevo.",
  "La opinión de 10000 hombres no tiene ningún valor si ninguno de ellos sabe nada sobre el tema.",
  "No digas: es imposible. Di: no lo he hecho todavía.",
  "El árbol se tala desde abajo.",
  "Mira a las estrellas, pero no te olvides de encender la lumbre en el hogar.",
  "La arrogancia destruye los puntos de apoyo de la victoria.",
  "La alegría más grande es la inesperada.",
  "Si le apuntas a alguien es mejor que estés listo para apretar gatillo.",
  "Una batalla que parece perdida es la más emocionante.",
  "Como de todas maneras hablan de uno, lo mejor es hacer lo que uno quiera.",
  "Hoy has perdido, chico, pero no tiene por qué gustarte.",
  "Sancho, si los perros ladran es señal de que avanzamos.",
  "El principio de la salchicha: \"La teoría dice que si amas algo, nunca averiguar cómo se hizo.\"",
  "Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos.",
  "El que nunca cometió un error es porque nunca hizo nada. La clave es hacerse responsable y aprender de ellos.",
  "Afuera hay mucho dinero, e imprimen más a diario. Pero escúchame bien, solo hay 5 boletos premiados en el mundo, y esos son los únicos que habrá; sólo un bobo cambiaría eso por algo tan común como el dinero. ¿Acaso eres bobo?",
]);

phrases = phrases.concat([
  "La procrastinación es como una tarjeta de crédito: es muy divertida hasta que te llega el estado de cuenta -Christopher Parker",
  "Cuando tienes que escalar una montaña, no pienses que esperando se hará más pequeña -Vox Populi",
  "No te pongas a contemplar toda la escalera, simplemente da el primer paso -Martin Luther King",
  "Si pospones las cosas hasta que estés seguro de que están bien, entonces nunca lograrás hacer nada -Norman Vincent Peale",
  "El perfeccionismo es la madre de la procrastinación -Michael Hyatt",
  "Si no fuera por el último minuto, nada se haría -Rita Mae Brown",
  "La procrastinación es el Arte de mantenerse al día con las cosas de ayer -Don Marquis",
  "La mayor debilidad de un erudito es: llamar investigación a la procrastinación -Stephen King",
  "La procrastinación es una de las más comunes y mortales enfermedades, y el pago de su cuota en cuanto a éxito y felicidad es carísimo -Wayne Gretzky",
  "¿Sabes lo que sucede cuando le das una buena idea a un procrastinador?... Nada, no sucede nada -Anónimo",
  "Si quieres estar totalmente seguro, nunca te cases, ni te cambies de empleo. De hecho, es mejor que te quedes en casa, porque todavía no conozco a nadie que esté completamente seguro. Esa necesidad de estar seguro es solo procrastinación. -Mark Burnett",
  "Ponerte en Acción y Procrastinar son dos caras de la misma moneda. Del lado de la Procrastinación pierdes, y poniéndote en Acción ganas -Anónimo",
  "Mi pecado es la procrastinación. No me trae más que penas y dolor. Sé que debo detenerla. De hecho, lo haré mañana -Gloria Pitzer",
  "El tiempo que disfrutas perdiendo, no es tiempo perdido -Bertrand Russell",
  "Lo que se aplaza no se evita -Tomás Moro",
  "Piensa en muchas cosas; haz solo una -Proverbio Portugués",
  "El miedo detiene a mucha gente. El miedo al fracaso, al desconocimiento, al riesgo. Y se enmascara como procrastinación -Lisa Anderson",
  "Ahora no puedo pensar en eso. Si lo hago enloquezco. Mejor mañana pienso en ello -Scarlett OHara",
  "Tú podrás retrasarte, pero el tiempo no lo hará -Benjamin Franklin",
  "Nunca pospongo hasta mañana lo que puedo hacer... el día después -Oscar Wilde",
  "Te dije que el escrito estaría en 5 minutos. ¡Deja de llamarme cada media hora para recordármelo! -Anónimo",
  "¿Y si antes de empezar lo que hay que hacer empezamos lo que tendríamos que haber hecho? -Amigo de Mafalda.",
  "La mejor manera posible de prepararte para el mañana es concentrarte con toda tu inteligencia, con todo tu entusiasmo, haciendo el trabajo de hoy magníficamente. Esa es la única manera posible de prepararte para el futuro -Dale Carnegie",
  "La procrastinación hace difíciles las cosas fáciles, y hace aun más difíciles las cosas difíciles -Mason Cooley",
  "Un día te despertarás y ya no tendrás más tiempo para hacer las cosas que siempre quisiste hacer -Paulo Coelho",
]);
