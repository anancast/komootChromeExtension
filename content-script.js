let komootExtension = {
	init: function(){
		komootExtension.config = {};
		let pathname = window.location.pathname.split("/");
		if(pathname[1] && pathname[1] == "user"){
			komootExtension.config.userId = pathname[2];
			komootExtension.checkMenuButton("user");
		}
		if(pathname[1] && pathname[1] == "collection"){
			komootExtension.config.collectionId = pathname[2];
			komootExtension.checkMenuButton("collection");
		}
	},
	buttonTypes:{
		user:"user-follow-menu-trigger",
		collection:"collection-more-actions-toggle"
	},
	checkMenuButton: function(type){
		let page = document.querySelector('.page');
		let observer = new MutationObserver(mutations => {
			komootExtension.config.menuButton = document.querySelector('[data-test-id="'+ komootExtension.buttonTypes[type] +'"]');
			if(!komootExtension.config.menuButton){
				return true;
			}
			mutations.forEach(mutation => {
				if(mutation.type === 'childList' && mutation.target.className == komootExtension.config.menuButton.parentElement.className && mutation.addedNodes.length !== 0){
					komootExtension.addDownloadRoutesButton(mutation.addedNodes[0]);
				}
			});
		});
		observer.observe(page, {childList: true, subtree:true});
	},
	addDownloadRoutesButton: function(container){
		let button = container.querySelector('button[role="menuitem"]');
		if(!button){
			return;
		}
		komootExtension.downloadButton = document.createElement("button");
		komootExtension.downloadButton.classList = button.classList;
		komootExtension.downloadButton.innerHTML = button.innerHTML.replace(/>[\s\S]*</, ">Download activities<");
		komootExtension.downloadButton.addEventListener("click", komootExtension.downloadRoutes);
		button.parentNode.appendChild(komootExtension.downloadButton);
	},
	getRoutes: async function(page){
		let routes = [], url;
		page = page || 0;
		if(komootExtension.config.userId){
			url = "https://www.komoot.com/api/v007/users/"+ komootExtension.config.userId +"/tours/?limit=50&status=public&type=tour_recorded&sort_field=date&sort_direction=desc&page="+ page;
		}
		if(komootExtension.config.collectionId){
			url = "https://www.komoot.com/api/v007/collections/"+ komootExtension.config.collectionId +"/compilation/?limit=50&page="+ page;
		}
		const response = await fetch(url);
		const json = await response.json();
		if(json._embedded && json._embedded.tours){
			routes.push(...json._embedded.tours);
		}
		if(json._embedded && json._embedded.items){
			routes.push(...json._embedded.items);
		}
		if(json.page && json.page.number < json.page.totalPages){
			routes.push(...(await komootExtension.getRoutes(page + 1)));
		}
		return routes;
	},
	downloadRoutes: async function(){
		let defaultContent = komootExtension.config.menuButton.innerHTML;
		komootExtension.config.menuButton.innerHTML = komootExtension.loader;
		let routes = await komootExtension.getRoutes();
		if(routes.length == 0){
			komootExtension.config.menuButton.innerHTML = defaultContent;
			return alert('Routes not found');
		}
		let title = (komootExtension.config.userId) ? routes[0]._embedded.creator.display_name : document.querySelector('h1').textContent;
		const parser = new DOMParser();
		const gpx = parser.parseFromString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\">\n</gpx>", "application/xml");
		const metadata = gpx.createElement("metadata");
		const name = gpx.createElement("name");
		const text = gpx.createTextNode(title);
		name.appendChild(text);
		metadata.appendChild(name);
		gpx.documentElement.appendChild(metadata);
		for(let i = 0, size = routes.length; i < size; i++){
			let response = await fetch("https://www.komoot.com/api/v007/tours/"+ routes[i].id +".gpx?hl=en");
			let text = await response.text();
			let doc = parser.parseFromString(text, "text/xml");
			gpx.documentElement.appendChild(gpx.importNode(doc.querySelector("trk"), true));
		}
		komootExtension.config.menuButton.innerHTML = defaultContent;
		const serializer = new XMLSerializer();
		const anchor = document.createElement("a");
		anchor.href = URL.createObjectURL(new Blob([serializer.serializeToString(gpx)], {type:"application/xml"}));
		anchor.download = title +".gpx";
		anchor.click();
	},
	loader:'<svg width="30" height="30" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">\
						<circle cx="25" cy="25" r="20" fill="none" stroke="#4f6814" stroke-width="4"></circle>\
						<circle cx="25" cy="25" r="20" fill="none" stroke="#ede9de" stroke-width="4" stroke-dasharray="31.4 31.4" stroke-linecap="round">\
							<animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"></animateTransform>\
						</circle>\
					</svg>'
}
komootExtension.init();

const loadingIndicator = document.querySelector('[data-test-id="page-loading-indicator"]');
const defaultClassName = loadingIndicator.className;
const observer = new MutationObserver(mutations => {
	mutations.forEach(mutation => {
		if(mutation.type === 'attributes' && mutation.target.classList.contains(defaultClassName)){
			komootExtension.init();
		}
	});
});
observer.observe(loadingIndicator, {attributes: true});