var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var data = require('./model');

//Allow access to the API from an app with same origin
/*
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 3000;
var router = express.Router();

router.route('/questions/:question_id')

    // respond to a question (accessed at POST /api/questions/:question_id)
    .post((req, res) => {
      data.saveResponse(req.params.question_id,req.body.answer_id)
        .then( (result) => {
          res.send(result + " " + req.params.question_id + " " + req.body.answer_id);
        }, (error) => {
          res.send(error);
        });
      })

    // get a question (accessed at GET /api/questions/:question_id)
    .get((req, res) => {
      data.getQuestionData(req.params.question_id)
        .then( (question) => {
          res.json(question);
        }, (error) => {
            res.send(error);
        });
      });

router.route('/questions/:question_id/results')

    // get results for a question (accessed at GET /api/questions/:question_id/results)
    .get((req, res) => {
      data.getResults(req.params.question_id)
        .then( (results) => {
          res.json(results);
        }, (error) => {
            res.send(error);
        });
      });

router.route('/upload')

  // upload static data into Redis (accessed at POST /upload)
  .post((req, res) => {
    if (req.params.token=="undefined" || req.params.token!="supersecret") {
      res.send("Failed: Authentication invalid");
    } else {
      data.uploadQuestionData()
          .then( (result) => {
            res.send("Success");
          }, (error) => {
            res.send(error);
          });
      }
    });

app.use('/api', router);
app.listen(port, error => {
  if (error) return console.error(err);
  console.info(`Server running on port ${port}`);
});
