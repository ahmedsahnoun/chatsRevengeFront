modal = document.getElementById("modal")
twitch = window.Twitch.ext

backend = null
token = null

StreamerId = null
categories = null
products = null
specielKeyList = null
selectedId = null
selectedCategory = null
selectedProduct = null
selectedVariant = null
selectedDuration = null
selectedInput = null
selectedName = null

async function refreshConfig(message) {
	const parsedBroadcaster = message ? JSON.parse(message) : JSON.parse(twitch.configuration.broadcaster.content)
	if (parsedBroadcaster.configURL) {
		const rawConfig = await fetch(parsedBroadcaster.configURL)
		const currentConfig = await rawConfig.json()
		products = currentConfig.products
		specielKeyList = currentConfig.specielKeyList
	}
	else {
		products = JSON.parse(twitch.configuration.broadcaster.content).products
		specielKeyList = JSON.parse(twitch.configuration.broadcaster.content).specielKeyList
	}
	categories = Object.keys(products)
	categories = categories.filter((category) => {
		return Object.keys(products[category]).some((product) => !products[category][product].disabled)
	})
	selectedCategory = categories[0]
}

twitch.onAuthorized(function (auth) {
	StreamerId = auth.channelId
	token = auth.token
});

twitch.listen('broadcast', async function (topic, contentType, message) {
	await refreshConfig(message)
	generateCategories()
	generateProducts()
})

twitch.configuration.onChanged(async () => {
	if (twitch.configuration.broadcaster) {
		await refreshConfig()
	}
	if (twitch.configuration.global) {
		backend = JSON.parse(twitch.configuration.global.content).backend
	}
	generateCategories()
	generateProducts()
})

twitch.bits.onTransactionCancelled(() => {
	modal.classList.add("hidden")
	selectedProduct = null
})

twitch.bits.onTransactionComplete((transaction) => {
	fetch(backend + "/buy", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
		body: JSON.stringify({
			token,
			transaction,
			selectedId,
			StreamerId,
			selectedCategory,
			selectedProduct,
			selectedVariant,
			selectedDuration,
			selectedInput,
			selectedName,
		})
	})

	modal.classList.add("hidden")

	selectedProduct = null
})

const generateCategories = () => {
	options = ""
	for (category of categories) options += `<option value="${category}">${category}</option>`

	result = /*html*/`
		<div>Action categories:</div>
			<select id="options">
				${options}
			</select>
			<input id="input" placeholder="username" type="text"></input>
	`

	document.getElementsByClassName("categoryContainer")[0].innerHTML = result

	document.getElementById("options").onchange = e => {
		selectedCategory = e.target.value
		generateProducts()
	}
}

const generateProducts = () => {
	result = ""
	for (title in products[selectedCategory]) {
		product = products[selectedCategory][title]
		if (!product.disabled)
			for (variantIndex in product.variants) {
				variant = product.variants[variantIndex]
				result += /*html*/`
				<button 
					id="${product.id}"
					data-variantindex="${variantIndex}"
					data-value="${variant.price}"
					data-name="${variant.name}"
					data-duration="${variant.duration}"
					data-category="${selectedCategory}"
					data-product="${title}" 
					data-input="${product.input}" 
					class="card">
					<div class="card-content">
						<div class="title">
						${title === "Play" ? title + " " + variant.name :
						title + (variant.duration ? ' - ' + variant.duration + "s" : "")}
						</div>
						<div class="price">
							<div>
								${variant.price}
								<img src="./assets/bits.png">
							</div>
						</div>
					</div>
				</button>
			`
			}
	}

	document.getElementById("cards").innerHTML = result

	for (card of document.getElementsByClassName("card")) card.onclick = e => buy(e)

	// inputTitle = document.getElementById("inputTitle")
	input = document.getElementById("input")
	if (Object.keys(products[selectedCategory]).some((product) => products[selectedCategory][product].input))
		input.style.display = 'block'
	else
		input.style.display = 'none'

	input.value = ""
	switch (selectedCategory) {
		default: {
			input.onkeydown = null
			input.placeholder = 'Input'
			break
		}
		case "Timeout": {
			input.placeholder = 'Username'
			input.removeAttribute('maxlength')
			input.onkeydown = null
			break
		}
		case "Input": {
			input.placeholder = 'Choose 1 key'
			input.setAttribute('maxlength', '1')
			input.onkeydown = e => {
				e.preventDefault()
				if (e.key === ' ') {
					input.value = 'space'
					return
				}
				if (e.key === 'Meta' && specielKeyList.Windows) {
					input.value = 'Windows'
					return
				}
				if (
					e.key.length === 1
					|| (e.key.startsWith('F') && specielKeyList.F_Keys)
					|| (e.key.startsWith('Arrow') && specielKeyList.ArrowKeys)
					|| specielKeyList[e.key]
				) {
					input.value = e.key
					return
				}
			}
			break
		}
	}
}

const buy = e => {

	selectedId = e.target.id
	price = e.target.dataset.value
	selectedCategory = e.target.dataset.category
	selectedProduct = e.target.dataset.product
	variantIndex = e.target.dataset.variantindex
	selectedVariant = products[selectedCategory][selectedProduct].variants[variantIndex]
	selectedDuration = e.target.dataset.duration
	selectedName = e.target.dataset.name
	inputRequired = e.target.dataset.input


	if (inputRequired === "true") {
		input = document.getElementById("input")
		if (input.value === '' || (selectedProduct === "Press key" && input.value.length > 1)) {
			input.classList.add("invalid")
			setTimeout(() => {
				input.classList.remove('invalid');
			}, 600);
			return
		}
		selectedInput = input.value
	}

	modal.classList.remove("hidden")

	fetch(backend + "/ping", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token,
		},
	})
		.then((response) => response.json())
		.then(
			() => Twitch.ext.bits.useBits(price)
		)
		.catch(
			() => modal.classList.add("hidden")
		)
}

// card glow effect
cards.onmousemove = e => {
	for (const card of document.getElementsByClassName("card")) {
		const rect = card.getBoundingClientRect(),
			x = e.clientX - rect.left,
			y = e.clientY - rect.top;
		card.style.setProperty("--mouse-x", `${x}px`);
		card.style.setProperty("--mouse-y", `${y}px`);
	};
}
// card glow effect
