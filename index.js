'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

let offer;
let customer_id = 'C1000001'
let questions = [ 
					{ key : "ReasonForLeaving", text : "May we ask why you are considering leaving U+ Communications?", option1 : "Competitive Offer", option2 : "Too Expensive", option3 : "Poor Coverage"},
					{ key : "SelectOperator", text : "Which operator are you interested in?", option1 : "Chat Chat", option2 : "Value Communications", option3 : "Communiko"},
					{ key : "Interests", text : "What interests you most about them?", option1 : "Great promotion", option2 : "Good network", option3 : "Economical"}
				];
let q1ans;
let q2ans;
let q3ans;

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
			//console.log("User details   :    "+JSON.stringify(event.sender))
			if (text === 'Generic'){ 
				console.log("Hello, I'm UplusBot. I try to be helpful. (But I'm still just a bot. Sorry!)\n Type something to get started.")
				//sendGenericMessage(sender)
				continue
			} 

			else if(text.includes('offer') || text.includes('plan') || text.includes('deal') || text.includes('Deal')|| text.includes('Offer')|| text.includes('Plan') ) {
				sendTextMessage(sender, "Let me check what kind of offers I have got in store for you.", token)
				sendBestOffer(sender)
				//sendTextMessage(sender, "Depending on your usage details and, previous interactions with UPlus, I suggest you this offer.", token)
				// sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
			}

			else if(text.includes('issue') || text.includes('problem') || text.includes('bad') || text.includes('cancel') ) {
				initiateSurvey(sender)
				//sendTextMessage(sender, "Let me check what kind of offers I have got in store for you.", token)
				//sendBestOffer(sender)
				// sendTextMessage(sender, "Depending on your usage details and, previous interactions with UPlus, I suggest you this offer.", token)
				// sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
			}

			else {
				sendTextMessage(sender, "Sorry, I didn't get that!", token)
			}
		}
		if (event.postback) {
			let text = event.postback.payload
			
			if (text === 'OFFER_ACCEPTED') {	
				console.log('Offer data'+JSON.stringify(offer))
				offerDecision(sender, offer, "Accepted", "Positive")
				//sendTextMessage(sender, "Offer has been accepted", token)
			}
			else if (text === 'OFFER_REJECTED') {
				offerDecision(sender, offer, "Rejected", "Negative")
				sendOptions(sender);
			}
			else if (text === 'DATA_OFFERS') {
				sendTextMessage(sender, "Let me check what kind of data offers I have got in store for you.", token)
				sendBestOffer(sender, "Data");
				//sendTextMessage(sender, "Depending on your usage details and, previous interactions with UPlus, I suggest you this data offer.", token)
			}
			else if (text === 'SMS_OFFERS') {
				sendTextMessage(sender, "Let me check what kind of texting offers I have got in store for you.", token)
				sendBestOffer(sender, "Message");
				//sendTextMessage(sender, "Depending on your usage details and, previous interactions with UPlus, I suggest you this texting offer.", token)
			}
			else if (text === 'VOICE_OFFERS') {
				sendTextMessage(sender, "Let me check what kind of voice offers I have got in store for you.", token)
				sendBestOffer(sender, "Call");
				//sendTextMessage(sender, "Depending on your usage details and, previous interactions with UPlus, I suggest you this voice offer.", token)
			}
			else if (text === 'OFFER_RELEVANCE') {
				sendTextMessage(sender, JSON.stringify(offer.EligibilityDescription).replace(/"/g,''), token)
			}
			else if (text === 'Competitive Offer' || text === 'Too Expensive' || text === 'Poor Coverage') {
				//sendTextMessage(sender, "Competitive offer")
				q1ans = text
				sendQuestion(sender, questions[1])
			}
			else if (text === 'Chat Chat' || text === 'Value Communications' || text === 'Communiko') {
				//sendTextMessage(sender, "Chat Chat")
				q2ans = text
				sendQuestion(sender, questions[2])
			}
			else if (text === 'Great promotion' || text === 'Good network' || text === 'Economical') {
				//sendTextMessage(sender, "Thanks for the survey! Our CSR will get back to resolve your issue")
				q3ans = text
				sendValueStatements(sender, q1ans, q2ans, q3ans)
			}
			else if (text === 'HAPPY_CUSTOMER') {
				sendTextMessage(sender, "Thank You! It was a pleasure serving you.", token)
			}
			else if (text === 'UNHAPPY_CUSTOMER') {
				sendTextMessage(sender, "Sorry for the inconvenience! Our CSR will get back to resolve your issue.", token)
				retriveBundle(sender)
			}
			else if (text === 'BUNDLE_ACCEPTED') {
				sendTextMessage(sender, "Your bundle will be activated in 1-2 business days", token)
			}
			else if (text === 'BUNDLE_REJECTED') {
				sendTextMessage(sender, "Sorry for the inconvenience! Our CSR will get back to resolve your issue.", token)
			}  
			else {
				console.log("Text: " + text + " " + JSON.stringify(event.postback))
				sendTextMessage(sender, text.substring(0, 200), token)
				//sendBestOffer(sender);
				//sendGenericMessage(sender, token)
			}
			continue
		}
	}
	res.sendStatus(200)
})

// Retrives a bundle in retention scenario
function retriveBundle(sender) {
	request({
		url: 'https://f9a1ba24.ngrok.io/prweb/PRRestService/PegaMKTContainer/V2/Container',
		method: 'POST',
		json: {
			ContainerName: "RecommendedBundle",
			CustomerID:  customer_id
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else {
			console.log("RecommendedBundle ****************** "+ JSON.stringify(response));
			let bundle = response.body.ResponseData.RecommendedBundle.RankedResults
			sendRecommendedBundle(sender, bundle);
		}
	})
}

// Sends recommended bundle in the retention scenario
function sendRecommendedBundle(sender, bundle) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": []
			}
		}
	}
	//console.log("ITEM 1 : ****************"+JSON.stringify(bundle[1]))
	for(var i = 1 ; i < JSON.stringify(bundle.length) ; i++) {
		messageData.attachment.payload.elements[i-1] = {
			"title": JSON.stringify(bundle[i].Label).replace(/"/g,''),
			"subtitle": JSON.stringify(bundle[i].ShortDescription).replace(/"/g,''),
			"image_url": "https://f9a1ba24.ngrok.io/uplus/"+JSON.stringify(bundle[i].ImageURL).replace(/"/g,''),
			"buttons": [{
				"type": "postback",
				"title": "Accept Bundle",
				"payload": "BUNDLE_ACCEPTED",
				}, {
				"type": "postback",
				"title": "Not interested",
				"payload": "BUNDLE_REJECTED",
				}, {
				"type": "postback",
				"title": "Why am I seeing this?",
				"payload": "asd",
				}],
		 }

		console.log("bundle[i].Label = "+JSON.stringify(bundle[i].Label))
	}//for end

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

// Retrives the best offer for a specific type - voice/sms/data
function sendValueStatements(sender, ans1, ans2, ans3) {
	
	request({
		url: 'https://f9a1ba24.ngrok.io/prweb/PRRestService/PegaMKTContainer/V2/Container',
		method: 'POST',
		json: {
			"ContainerName" : "ValueStatements",
			"Channel" : "CallCenter",
			"CustomerID" : "C1000001",
			"Direction" : "Inbound",
			"Contexts": [ {"Type" : "QnA", "Value" : "Competitive Offer", "Key" : "ReasonForLeaving"},
						  {"Type" : "QnA", "Value" : ans2, "Key" : "SelectOperator"},
						  {"Type" : "QnA", "Value" : ans3, "Key" : "Interests"} ], 
			"PartyType":"" 
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else {
			console.log("Value statements   ****************  "+JSON.stringify(response));
			let valueStatements = response.body.ResponseData.ValueStatements.RankedResults
			for(var i = 0 ; i < 1 ; i++ ) {
				sendTextMessage(sender, JSON.stringify(valueStatements[i].ShortDescription).replace(/"/g,''), token)
			}
			postVSurvey(sender)
		}
	})
}

// Survey that is to be conducted post sending value statements
function postVSurvey(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "button",
				"text": "Do you want to continue with the existing plan?",
				"buttons":[
					{
						"type":"postback",
						"payload": "HAPPY_CUSTOMER",
						"title": "Yes"
					},
					{
						"type":"postback",
						"payload": "UNHAPPY_CUSTOMER",
						"title": "No"
					},
					{
						"type":"phone_number",
						"payload": "+918466975975",
						"title": "Call Representative"
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


// Send survey to the customer to know his issues/preferences
function initiateSurvey(sender) {
	sendQuestion(sender, questions[0]);
}

// Send question to the customer/user
function sendQuestion(sender, question) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "button",
				"text": question.text,
				"buttons":[
					{
						"type":"postback",
						"payload": question.option1,
						"title": question.option1
					},
					{
						"type":"postback",
						"payload": question.option2,
						"title": question.option2
					},
					{
						"type":"postback",
						"payload": question.option3,
						"title": question.option3
						
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


// This function initiates an interaction with CS and activates the offer 
function offerDecision(sender, offer, outcome, behaviour) {
	offer.Outcome = outcome
	offer.Behaviour = behaviour
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
					"Outcome": outcome,
					"Behaviour": behaviour
				}
			]}
		}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else {
			if(outcome === "Accepted") {
				sendTextMessage(sender, offer.Label+" activated",token)
			}
			console.log("Status : "+response.Status+"Message : "+response.Message)
			console.log(request);
		}
	})
}

// Retrives the best offer for a specific type - voice/sms/data
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
			sendGenericMessage(sender, JSON.stringify(offer.Label).replace(/"/g,''), JSON.stringify(offer.ImageURL).replace(/"/g,''), JSON.stringify(offer.ShortDescription).replace(/"/g,''), offer, token)
		}
	})
}

// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.FB_PAGE_ACCESS_TOKEN
const token = "EAADttZCnpsAcBAD0GqqC6zCY1ZCDMMZA8zLQ6KFD0ul7w4NQsoiR8dY8N0LlVZCiGNcYZC0v6kAcFj3fDVBrn4iBnKzFfn56tflYTT8qRlTP8aH5AmG3WlKkvpeB7ssO2yjteoPmGy01gnYZCoU48tGQPRrzL8YcA2dlImW8j3uQZDZD"

// This function sends a text message to the user
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

// This function displays an offer to the user
function sendGenericMessage(sender, label, image, desc, proposition) {
	offer = proposition
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": label,
					"subtitle": desc,
					"image_url": "https://f9a1ba24.ngrok.io/uplus/"+image,
					"buttons": [{
						"type": "postback",
						"title": "Accept Offer",
            			"payload": "OFFER_ACCEPTED",
					}, {
						"type": "postback",
						"title": "Not interested",
						"payload": "OFFER_REJECTED",
					}, {
						"type": "postback",
						"title": "Why am I seeing this?",
						"payload": "OFFER_RELEVANCE",
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

// This function conducts survey to know customer preferences - Data/Voice/SMS
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

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
