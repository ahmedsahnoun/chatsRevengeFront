var twitch = window.Twitch.ext
var backend = null
var defaultProducts = null

var prices = []
var token = null
var products = {}
var categories = null
var selectedCategory = null
var SoundUrl = null
var specielKeyList = {
	ArrowKeys: false,
	F_Keys: false,
	Shift: false,
	Alt: false,
	Escape: false,
	Enter: false,
	Tab: false,
	Windows: false,
	Delete: false,
	Control: false,
	BackSpace: false,
}

twitch.onAuthorized(async function (auth) {
	token = auth.token

	if (twitch.configuration.global) {
		backend = JSON.parse(twitch.configuration.global.content).backend
	}

	if (twitch.configuration.broadcaster) {
		const parsedBroadcaster = JSON.parse(twitch.configuration.broadcaster.content)
		if (parsedBroadcaster.configURL) {
			const rawConfig = await fetch(parsedBroadcaster.configURL)
			const currentConfig = await rawConfig.json()
			products = currentConfig.products
			SoundUrl = currentConfig.SoundUrl
			specielKeyList = currentConfig.specielKeyList || specielKeyList
		}
		else {
			products = JSON.parse(twitch.configuration.broadcaster.content).products
			SoundUrl = JSON.parse(twitch.configuration.broadcaster.content).SoundUrl
			specielKeyList = JSON.parse(twitch.configuration.broadcaster.content).specielKeyList || specielKeyList
		}
		if (!products) {
			products = {}
			fetchDefaultProducts()
		}
		generateCategories()
		generateVariants()
	}

	twitch.bits.getProducts().then(x => {
		prices = x.map(p => p.sku).sort((a, b) => a - b)
		generateCategories()
		generateVariants()
	})

	// products = defaultProducts
	// updateBroadcaster()
	document.getElementById("soundUrl").onchange = e => updateSounds()
	document.getElementById("soundUrl").value = SoundUrl || ""

	fetchDefaultProducts()
});

var fetchDefaultProducts = () => {
	fetch(backend + "/defaultProducts", {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
	})
		.then((response) => response.json())
		.then(
			(response) => {
				defaultProducts = response
				for (let categ in defaultProducts) {
					if (!(categ in products)) {
						products[categ] = defaultProducts[categ]
					}
					else {
						for (let prod in defaultProducts[categ]) {
							if (!(prod in products[categ]))
								products[categ][prod] = defaultProducts[categ][prod]
							for (let property in defaultProducts[categ][prod])
								if (!(property in products[categ][prod]))
									products[categ][prod][property] = defaultProducts[categ][prod][property]
						}
					}
				}
				for (let categ in products) {
					if (!(categ in defaultProducts)) {
						delete products[categ]
					}
					else {
						for (let prod in products[categ])
							if (!(prod in defaultProducts[categ]))
								delete products[categ][prod]
					}
				}
				generateCategories()
				generateVariants()
			}
		)
}

const generateCategories = () => {
	categories = Object.keys(products)
	selectedCategory = categories[0]
	options = ""
	for (category of categories) options += `<option value="${category}">${category}</option>`
	document.getElementById("category").innerHTML = options
	document.getElementById("soundUrl").innerHTML = SoundUrl
	document.getElementsByClassName("saveButton")[0].onclick = e => updateBroadcaster()

	document.getElementById("category").onchange = e => {
		selectedCategory = e.target.value
		document.getElementById('soundUrlContainer').style.visibility = (selectedCategory === "Sound" ? "visible" : "hidden")
		generateVariants()
	}
}

const generateVariants = () => {
	result = ""
	if (selectedCategory === "Input") {
		result += /*html*/`<div id="KeyCheckBoxContainer">`
		result += Object.keys(specielKeyList).map(key => {
			return (/*html*/`
			<div class="KeyCheckBox">
				<input type="checkbox" ${specielKeyList[key] ? "checked" : ""} id="specielKeyList_${key}">
				${key}
			</div>
		`)
		}).join('\n')
		result += /*html*/`</div>`
	}
	// if (Object.keys(products).length)
	for (product of Object.keys(products[selectedCategory])) {
		result += /*html*/`<div class="productContainer">`
		if (selectedCategory === "Sound") {
			currentVariants = products[selectedCategory][product].variants
			result += currentVariants.map((variant, index) => {
				return (/*html*/`
				<div class="product">
					<div> Name:
						<input disabled class="name" value="${variant.name}"/>
					</div>
					<div>Amount of bits:
						<select class="price"  data-product="${product}" data-index="${index}" id="numberSelect">
							${prices.map((price) =>/*html*/`<option value="${price}" ${variant.price == price ? "selected" : ""}>${price}</option>`)}
						</select>
					</div>
				`)
			}).join("\n")
		}
		else {
			currentVariants = products[selectedCategory][product].variants

			result += /*html*/`
			<div>
				<span class="productTitle">${product}</span>
				${(!products[selectedCategory][product].unique) ?
					/*html*/`<button  data-product="${product}" ${products[selectedCategory][product].disabled ? "class='toggle disabled'>disabled" : "class='toggle enabled'>enabled"}</button>`
					: ''}
				${!products[selectedCategory][product].unique ? `<button class='add' data-product="${product}">+</button>` : ""}
			</div>
			`
			result += currentVariants.map((variant, index) => {
				return (/*html*/`
				<div class="product">
					${variant.duration ? /*html*/`
					<div> Duration in seconds:
						<input class="duration" data-product="${product}" data-index="${index}" type="number" min="1" value="${variant.duration}"/>
					</div>` : ""}
					${(variant.keyPress !== undefined) ? /*html*/`
					<div> Key:
						<input class="keyPress" data-product="${product}" data-index="${index}" type="text" value="${variant.keyPress}"/>
					</div>` : ""}
					<div>Amount of bits:
						<select class="price"  data-product="${product}" data-index="${index}" id="numberSelect">
							${prices.map((price) =>/*html*/`<option value="${price}" ${variant.price == price ? "selected" : ""}>${price}</option>`)}
						</select>
					</div>
					${!products[selectedCategory][product].input ?
							/*html*/`
								<button
								class="testButton"
								id="${products[selectedCategory][product].id}"
								data-value="${variant.price}"
								data-name="${variant.name}"
								data-duration="${variant.duration}"
								data-category="${selectedCategory}"
								data-product="${product}" 
								data-input="${products[selectedCategory][product].input}"
								> Test </button>`
						: ""
					}
					${(!products[selectedCategory][product].unique) ?
						/*html*/`<button class="delete" data-index="${index}" data-product="${product}">X</button>` :
						/*html*/`<button  data-product="${product}" ${products[selectedCategory][product].disabled ? "class='toggle disabled'>disabled" : "class='toggle enabled'>enabled"}</button>`}
						
				</div>
				`)
			}).join("\n")
		}
		result += /*html*/`</div>`
	}


	document.getElementsByClassName("products")[0].innerHTML = result
	for (let card of document.getElementsByClassName("delete")) card.onclick = e => deleteVariant(e)
	for (let card of document.getElementsByClassName("toggle")) card.onclick = e => toggle(e)
	for (let card of document.getElementsByClassName("add")) card.onclick = e => addVariant(e)
	for (let card of document.getElementsByClassName("testButton")) card.onclick = e => testProduct(e)
	for (let card of document.getElementsByClassName("price")) card.onchange = e => changePrice(e)
	for (let card of document.getElementsByClassName("duration")) card.onchange = e => changeVariantProperty(e, "duration")
	for (let card of document.getElementsByClassName("keyPress")) card.onchange = e => changeVariantProperty(e, "keyPress")

}

const addVariant = (e) => {
	product = e.target.dataset.product
	const newVariant = { "price": "100" }
	if (product === "pk") newVariant.keyPress = ""
	else newVariant.duration = "1"
	products[selectedCategory][product].variants.push(newVariant)
	generateVariants()
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
}

const deleteVariant = (e) => {
	index = e.target.dataset.index
	product = e.target.dataset.product
	products[selectedCategory][product].variants.splice(index, 1)
	generateVariants()
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
}

const changePrice = (e) => {
	index = e.target.dataset.index
	product = e.target.dataset.product
	products[selectedCategory][product].variants[index].price = e.target.value == 0 ? 1 : e.target.value
	generateVariants()
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
}

const changeVariantProperty = (e, property) => {
	index = e.target.dataset.index
	product = e.target.dataset.product
	products[selectedCategory][product].variants[index][property] = e.target.value
	generateVariants()
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
}

const toggle = (e) => {
	product = e.target.dataset.product
	products[selectedCategory][product].disabled = !products[selectedCategory][product].disabled
	generateVariants()
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
}

const updateSounds = () => {
	document.getElementsByClassName("saveButton")[0].classList.add("unsaved")
	SoundUrl = document.getElementById("soundUrl").value
	products["Sound"]["Play"].variants = []
	generateVariants()

	fetch(backend + "/getSounds", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
		body: JSON.stringify({
			SoundUrl
		})
	})
		.then((response) => response.json())
		.then((result) => {
			products["Sound"]["Play"].variants = result.map((sound) => (
				{ "name": sound, "duration": null, "price": "300" }
			))
			generateVariants()
		})
		.catch(() => {
			products["Sound"]["Play"].variants = []
		})
}

const updateBroadcaster = () => {
	for (let category in products) {
		for (let product in products[category]) {
			if (!products[category][product].unique && !products[category][product].disabled)
				products[category][product].disabled = products[category][product].variants.length === 0
		}
	}
	if (document.getElementById('KeyCheckBoxContainer'))
		Object.keys(specielKeyList).forEach(key => {
			specielKeyList[key] = document.getElementById(`specielKeyList_${key}`).checked
		})

	newBroadcast = { products: products, SoundUrl, specielKeyList }
	document.getElementsByClassName("saveButton")[0].textContent = "SAVING IN PROGRESS"

	fetch(backend + "/saveBroadcast", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
		body: JSON.stringify({
			broadcast: newBroadcast
		})
	})
		.then(response => response.json())
		.then(response => {
			// newBroadcast = { configURL: response, products: products, SoundUrl, specielKeyList }
			newBroadcast = { configURL: response }
			twitch.configuration.set('broadcaster', '1', JSON.stringify(newBroadcast))
			window.Twitch.ext.send("broadcast", "application/json", newBroadcast)
			document.getElementsByClassName("saveButton")[0].textContent = "SAVE"
			document.getElementsByClassName("saveButton")[0].classList.remove("unsaved")
		})
}

function testProduct(e) {
	selectedId = e.target.id
	price = e.target.dataset.value
	selectedCategory = e.target.dataset.category
	selectedProduct = e.target.dataset.product
	selectedDuration = e.target.dataset.duration
	selectedName = e.target.dataset.name
	inputRequired = e.target.dataset.input

	fetch(backend + "/testProduct", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
		body: JSON.stringify({
			token,
			selectedId,
			selectedCategory,
			selectedProduct,
			selectedDuration,
			selectedInput: "",
			selectedName,
		})
	})
}

function getEnabledProducts(products) {
	let result = {}
	for (let category in products)
		for (let product in products[category])
			if (!products[category][product].disabled) {
				if (!result[category]) result[category] = {}
				result[category][product] = products[category][product]
			}
	return (result)
}