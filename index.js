'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

let offer;
let customer_id = 'C1000001'

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// to post data
app.post('/webhook/', function (req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id
		if (event.message && event.message.text) {
			let text = event.message.text
			if (text === 'Generic'){ 
				console.log("welcome to chatbot")
				//sendGenericMessage(sender)
				continue
			} 

			else if(text === 'offer') {
				sendBestOffer(sender)
				sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
			}
			else {
				sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
			}
		}
		if (event.postback) {
			let text = event.postback.payload
			
			if (text === 'OFFER_ACCEPTED') {	
				console.log('Offer data'+JSON.stringify(offer))
				acceptOffer(sender, offer)
				sendTextMessage(sender, "Offer has been accepted", token)
			}
			else if (text === 'OFFER_REJECTED') {
				sendOptions(sender);
			}
			else if (text === 'DATA_OFFERS') {
				sendBestOffer(sender, "Data");
			}
			else if (text === 'SMS_OFFERS') {
				sendBestOffer(sender, "Message");
			}
			else if (text === 'VOICE_OFFERS') {
				sendBestOffer(sender, "Call");
			}

			else {
				console.log("Text: " + text + " " + JSON.stringify(event.postback))
				sendTextMessage(sender, text.substring(0, 200), token)
				sendBestOffer(sender);
				//sendGenericMessage(sender, token)
			}
			continue
		}
	}
	res.sendStatus(200)
})

//This function initiates an interaction with CS and activates the offer 
function acceptOffer(sender, offer) {
	offer.Outcome = "Accepted"
	offer.Behaviour = "Positive"
	console.log("Offer : "+ '['+JSON.stringify(offer)+']'+"    customer id   :"+customer_id)
	request({
		url: 'https://f9a1ba24.ngrok.io/prweb/PRRestService/PegaMKTContainer/V1/CaptureResponse/Initiate',
		method: 'POST',
		json: {
			"CustomerID":customer_id,
			"RankedResults":[
				{
					"Group": offer.Group,
					"Issue": offer.Issue,
					"InteractionID": offer.InteractionID,
					"Direction":"Inbound",
					"Name": offer.Name,
					"Identifier":"/Retention/Preemptive/DataPlanMB",
					"Propensity":0.99,
					"Channel":"Call Center",
					"Rank":1,
					"Treatment":"Proactive Retention",
					"CampaignID":"NBA",
					"Outcome":"Accepted",
					"Behaviour":"Positive"
				}
			]}
		}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else {
			sendTextMessage(sender, offer.Label+" activated",token)
			console.log("Status : "+response.Status+"Message : "+response.Message)
			console.log(request);
		}
	})
}

//Retrives the best offer for a specific type - voice/sms/data
function sendBestOffer(sender, type) {
	
	request({
		url: 'https://f9a1ba24.ngrok.io/prweb/PRRestService/PegaMKTContainer/V2/Container',
		method: 'POST',
		json: {
			ContainerName: "TopOffers",
			CustomerID:  customer_id,
			Resource: type
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else {
			offer = response.body.ResponseData.TopOffers.RankedResults[0]
			console.log("Top Offer"+JSON.stringify(offer));
			sendGenericMessage(sender, JSON.stringify(offer.Label).replace(/"/g,''), JSON.stringify(offer.ImageURL).replace(/"/g,''), offer, token)
			
		}
	})
}

// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.FB_PAGE_ACCESS_TOKEN
const token = "EAADttZCnpsAcBAD0GqqC6zCY1ZCDMMZA8zLQ6KFD0ul7w4NQsoiR8dY8N0LlVZCiGNcYZC0v6kAcFj3fDVBrn4iBnKzFfn56tflYTT8qRlTP8aH5AmG3WlKkvpeB7ssO2yjteoPmGy01gnYZCoU48tGQPRrzL8YcA2dlImW8j3uQZDZD"

//This function sends a text message to the user
function sendTextMessage(sender, text) {
	let messageData = { text:text }
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

//This function displays an offer to the user
function sendGenericMessage(sender, label, image, proposition) {
	offer = proposition
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": label,
					"subtitle": "Element #1 of an hscroll",
					"image_url": "https://f9a1ba24.ngrok.io/uplus/"+image,
					"buttons": [{
						"type": "postback",
						"title": "Accept Offer",
            			"payload": "OFFER_ACCEPTED",
					}, {
						"type": "postback",
						"title": "Not interested",
						"payload": "OFFER_REJECTED",
					}],
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

//This function conducts survey to know customer preferences - Data/Voice/SMS
function sendOptions(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "button",
				"text":"What kind of offers are you looking for?",
				"buttons":[
					{
						"type":"postback",
						"payload":"DATA_OFFERS",
						"title":"Data"
					},
					{
						"type":"postback",
						"payload":"SMS_OFFERS",
						"title":"SMS"
					},
					{
						"type":"postback",
						"title":"Voice",
						"payload":"VOICE_OFFERS"
					}
				]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

//This function checks if the entered string has 'Offer', 'Plans' or 'Deals'
function checkForKeys(message) {
	off = message.indexOf('offer');
	plan = message.indexOf('plan');
	deal = message.indexOf('deal');

	return off || plan || deal;
}

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
