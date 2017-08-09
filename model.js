var raw_data = require('./questions');

var redis = require('redis');
var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL);
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
//var client = redis.createClient();
client.auth(redisURL.auth.split(":")[1]);

//get a question and the answers by id
var getQuestionData = (question_id) => {
  return new Promise((resolve,reject) => {
    if (question_id==="undefined") reject(false);
    else {
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
              reject(false);
            });
          }, (error) => {
            reject(false);
          });
    }
  });
}

//Questions are stored as a hash in Redis
var getQuestion = (question_id) => {
  return new Promise((resolve,reject) => {
    client.hget("questions",question_id, (error, q) => {
      if (error) reject(false);
      else if (q==="undefined") {
        reject(false);
      } else resolve({
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
      if (error) reject(false);
      else if (members.length==0) reject("No answers available.");
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

    getQuestion(question_id)
      .then((q) => {
        if (!q.text) reject(false);
        client.lpush(`results:${question_id}`,answer_id, (error) => {
          if (error) reject(false);
          else resolve(true);
        });
      })
      .catch((error) => {
        reject(false);
      });
  });
}

var getResults = (question_id) => {

  return new Promise ((resolve,reject) => {

    if (question_id===undefined) reject(false);
    getQuestionData(question_id)
      .then((qa) => {
        getResultData(question_id)
          .then((res) => {
            //build results object
            var results = {
              question: qa.question,
              answers: []
            };

            qa.answers.forEach( (a,i) => {
              results.answers[i] = {
                id: qa.answers[i].id,
                text: qa.answers[i].text,
                num_responses: (typeof res[a.id] === "undefined" ? 0 : res[a.id].num_responses),
                percent: (typeof res[a.id] === "undefined" ? 0 : res[a.id].percent)
              };
            });
            resolve(results);

          }, (error) => {
            reject(false);
          });
      }, (error) => {
        reject(false);
      });
    });
}

var getResultData = (question_id) => {

  return new Promise ((resolve,reject) => {

    var res = [];
    client.lrange(`results:${question_id}`,0,-1, (error, data) => {
        if (error) reject(false);
        else if (!(data instanceof Array)) reject(false);
        else {
          var total_responses = data.length;

          //build array with result tally. [answer_id] => num responses
          for (var i=0;i<total_responses;i++) {
              if (isInt(data[i])) {
                var answer_id = data[i];
                if (typeof res[answer_id]=="undefined") {
                  res[answer_id] = { num_responses: 0 }
                }
                res[answer_id].num_responses = res[answer_id].num_responses+1;
              }
          }

          //calculate percentages for each answer id
          if (res.length>0) {
            res.forEach((r) => {
                if (r.num_responses !== "undefined") {
                  r.percent = Math.floor((r.num_responses/total_responses)*100);
                }
            });
          }
          resolve(res);
        }
    });
  });
}

//RUN ONCE ONLY
//Put the question data into the database
//Umcomment console.log code for debugging local installs
var uploadQuestionData = () =>  {

  return new Promise ((resolve, reject) => {

    //Add answers to sorted set
    //  answers:question_id order [ answer_id:text... ]
    raw_data.answers.forEach((a) => {
      //console.log(`adding: answers:${a.question_id} ${a.order} ${a.id}:${a.text}`);
      client.zadd(`answers:${a.question_id}`,a.order,`${a.id}:${a.text}`, (error) =>{
        if (error) reject(false);
      });
    });

    //Add questions to hash
    // questions: [id] = text
    raw_data.questions.forEach((q) => {
        //console.log(`adding: questions ${q.id} ${q.text}`);
        client.hset("questions",q.id,q.text, (error) => {
          if (error) reject(false);
        });

        /*
        //Output questions and answers to screen
        client.hget("questions",q.id, (error, q) => {
          console.log(q);
        });
        client.zrangebyscore(`answers:${q.id}`, "-inf", "+inf", (err,members) => {
          members.forEach((m,i) => {
            console.log("   " + parseInt(i+1) + ") " + m);
          });
        });
        */
    });

    resolve(true);

  });
};

function isInt(n){
  return Number(n) === n && n % 1 === 0;
}

module.exports = {getQuestionData, saveResponse, getResults, uploadQuestionData};
