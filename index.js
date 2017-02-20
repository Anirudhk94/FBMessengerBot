'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

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
			sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
		}
		if (event.postback) {
			let text = event.postback.payload
			if (text === 'OFFER_ACCEPTED') {
				sendTextMessage(sender, "Offer has been accepted", token)
			}
			else if (text === 'OFFER_REJECTED') {
				sendTextMessage(sender, "Offer has been rejected", token)
			}
			else {
				console.log("Text: " + text + " " + JSON.stringify(event.postback))
				sendTextMessage(sender, text.substring(0, 200), token)
				sendGenericMessage(sender, token)
			}
			continue
		}
	}
	res.sendStatus(200)
})


// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.FB_PAGE_ACCESS_TOKEN
const token = "EAADttZCnpsAcBAD0GqqC6zCY1ZCDMMZA8zLQ6KFD0ul7w4NQsoiR8dY8N0LlVZCiGNcYZC0v6kAcFj3fDVBrn4iBnKzFfn56tflYTT8qRlTP8aH5AmG3WlKkvpeB7ssO2yjteoPmGy01gnYZCoU48tGQPRrzL8YcA2dlImW8j3uQZDZD"

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

function sendGenericMessage(sender) {
	let messageData = {
	    "attachment":{
	      "type":"template",
	      "payload":{
	        "template_type":"generic",
	        "elements":[
	           {
	            "title":"Welcome to Peter\'s Hats",
	            "image_url":"https://petersfancybrownhats.com/company_image.png",
	            "subtitle":"We\'ve got the right hat for everyone.",
	            "default_action": {
	              "type": "web_url",
	              "url": "https://peterssendreceiveapp.ngrok.io/view?item=103",
	              "messenger_extensions": true,
	              "webview_height_ratio": "tall",
	              "fallback_url": "https://peterssendreceiveapp.ngrok.io/"
	            },
	            "buttons":[
	              {
	                "type":"postback",
	                "title":"Accept Offer",
	                "payload": "OFFER_ACCEPTED"
	              },{
	                "type":"postback",
	                "title":"Reject Offer",
	                "payload":"OFFER_REJECTED"
	              }              
	            ]      
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
