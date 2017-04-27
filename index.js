var express = require('express');
var app = express();
var https = require('https');
var http = require('http');
var querystring = require('querystring');
var bodyParser = require('body-parser');
var config = require('./config');



app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(bodyParser.json());

app.get('/', function(request, response) {
  var pets = [];
  var pets_data = '';
  var errors = '';
  console.log(request.query.errors)
  if (request.query.errors == '1') {
    errors = 'Pet was not saved.'
  } else {
    errors = false
  }
  https.get( config.pet_shelter_base_url + '/api/v1/pets/index', (res) => {
    res.on('data', (data) => {
      pets_data += data;
    });

    res.on('end', function() {
      pets = JSON.parse(pets_data);
      response.render('pages/index', {pets: pets.pets, errors: errors});
    });

  }).on('error', (e) => {
    response.render('pages/index', {pets: [], errors: 'Server Error'});
  });
});

app.get('/pets/new', function(request, response) {
  response.render('pages/new');
});

app.post('/pets/create', function(request, response) {
  console.log(request.body);

  var postData = JSON.stringify({
    "name": request.body.name,
    "type": request.body.type,
    "breed": request.body.breed,
    "location": {
      "coordinates": [request.body.lattitude, request.body.longitude]
    }
  });

  var options = {
    hostname: 'intense-cliffs-94440.herokuapp.com',
    port: 80,
    path: '/api/v1/pets',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  var req = http.request(options, (res) => {
    var pet_data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
      pet_data += chunk;
    });
    res.on('end', () => {
      var response_data = JSON.parse(pet_data);
      var error = '0';
      if (response_data.error) {
        error = '1'
      }
      response.redirect('/?errors=' + error);
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
});

app.get('/pets/:id', function(request, response) {
  var pet = {};
  var wheather = {};

  https.get(config.pet_shelter_base_url + '/api/v1/pets/' + request.params.id, (res) => {
    res.on('data', (data) => {
      pet = JSON.parse(data);

      https.get(config.dark_sky + '/' + pet.pet.location.coordinates[0] + ',' + pet.pet.location.coordinates[1], (res) => {
        var wheather_data= '';

        res.on('data', (data) => {
          wheather_data += data;
        });

        res.on('end', function() {
          wheather = JSON.parse(wheather_data);
          console.log(wheather_data);
          response.render('pages/show', {
            pet: pet.pet,
            wheather: wheather.currently.icon,
            errors: false
          });
        });

      }).on('error', (e) => {
        response.render('pages/show', {pet: {}, wheather: '', errors: 'Server Error'});
      });
    }).on('error', (e) => {
      response.render('pages/show', {pet: {}, wheather: '', errors: 'Server Error'});
    })
  });
});



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


