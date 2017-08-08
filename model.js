var raw_data = require('questions');
var redis = require('redis');
var client = redis.createClient();

//get a question and the answers. if no question_id is provided, a random question is returned
/*
Return data format:
{
  question: {
    id: question_id,
    text: text
  },
  answers: [
    {
      id: answer_id,
      text: text
    },
    {
      id: answer_id,
      text: text
    },
    ...
  ]
}
*/
var getQuestionData = (question_id) => {
  return new Promise((resolve,reject) => {

    client.hkeys("questions",(error,keys) => {
      if (question_id!="undefined") {
        var i = getRandomInt(0,keys.length);
        question_id = keys[i];
      }

      getQuestion(question_id)
        .then((q_res) => {
          getAnswers(question_id)
            .then((a_res) => {
              resolve({
                question: {
                  id: q_res.id,
                  text: q_res.text
                },
                answers: a_res
              });
            }, (error) => {
              reject("Failed: ", error);
            });
          }, (error) => {
            reject("Failed: ", error);
          });
      });
    });
}

//Questions are stored as a hash in Redis
var getQuestion = (question_id) => {
  return new Promise((resolve,reject) => {
    client.hget("questions",question_id, (error, q) => {
      if (error) reject("Failed: ", error);
      else resolve({
        id: question_id,
        text: q
      });
    });
  });
}

//Answers are stored as sorted sets in Redis
var getAnswers = (question_id) => {
  return new Promise((resolve,reject) => {
    client.zrangebyscore(`answers:${question_id}`, "-inf", "+inf", (error,members) => {
      if (error) reject("Failed: ", error);
      else {
        var answers = [];
        members.forEach((m) => {
          var res = m.split(":");
          answers.push({
            id: res[0],
            text: res[1]
          });
        });
        resolve(answers);
      }
    });
  });
}

//Results are stored as lists in Redis
//obj = { question_id: xxx, answer_id: xxx }
//results:question_id = [ answer_id... ]
var saveResponse = (question_id,answer_id) => {
  return new Promise((resolve,reject) => {
    client.lpush(`results:${question_id}`,answer_id, (error) => {
      if (error) reject(error);
      else resolve(true);
    });
  });
}

var getResults = (question_id) => {
  var results = [];
  return new Promise((resolve,reject) => {

    //get results for this question
    client.lrange(`results:${question_id}`,0,-1, (error, data) => {
      var total_responses = data.length;

      //build array with result tally. [answer_id] => num responses
      for (var i=0;i<total_responses;i++) {
          var answer_id = data[i];
          if (results[answer_id]==undefined) {
            results[answer_id] = {
                num_responses: 1
            };
          } else results[answer_id].num_responses = results[answer_id].num_responses+1;
      }

      //calculate percentages for each answer id
      results.forEach((r) => {
        r.percent = Math.floor((r.num_responses/total_responses)*100);
      });

      //Bundle question and answer content with the results
      getQuestionData(question_id)
        .then((qa) => {
          resolve({
            question: qa.question,
            answers: qa.answers,
            results: results
          });
        }, (error) => {
            reject("Failed: ", error);
        });
      });
  });
}

//RUN ONCE ONLY
//Put the question data into the database
var uploadQuestionData = () =>  {

      //Add answers to sorted set
      //  answers:question_id order [ answer_id:text... ]
      raw_data.answers.forEach((a) => {
        console.log(`adding: answers:${a.question_id} ${a.order} ${a.id}:${a.text}`);
        client.zadd(`answers:${a.question_id}`,a.order,`${a.id}:${a.text}`);
      });

      //Add questions to hash
      // questions: [id] = text
      raw_data.questions.forEach((q) => {
          console.log(`adding: questions ${q.id} ${q.text}`);
          client.hset("questions",q.id,q.text);

          //Output questions and answers to screen
          client.hget("questions",q.id, (error, q) => {
            console.log(q);
          });
          client.zrangebyscore(`answers:${q.id}`, "-inf", "+inf", (err,members) => {
            members.forEach((m,i) => {
              console.log("   " + parseInt(i+1) + ") " + m);
            });
          });
      });
};

function getRandomInt(min, max) {
  var min = Math.ceil(min);
  var max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {getQuestionData, saveResponse, getResults};
