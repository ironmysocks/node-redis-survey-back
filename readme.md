node-redis-survey-back
======================

This backend API is used to store and retrieve questions, multiple-choice answers, and survey-style responses.

Get question
------------

* `GET /api/questions/:question_id` returns a question and multiple choice answers

**Response:**

``` json
{
  "question": {
    "id": "1",
    "text": "What is the question?"
  },
  "answers": [
    {
      "id": "1",
      "text": "Answer 1"
    },
    {
      "id": "2",
      "text": "Answer 2"
    },
    ...
  ]
}

```


Answer question
----------------

* `POST /questions/:question_id` stores a response to the question

**Request:**

``` json
{
  answer_id: "1"
}
```

**Response:**

```
true | false

```


Get results
-----------

* `GET /questions/:question_id/results` gets the number of responses for each answer of the question and the percentage of the total number of responses

**Response:**

This returns the question and answer content and the results array. The index of each item in the results array corresponds to the answer_id of those results. Null items indicate that there were no responses with that corresponding answer_id.

``` json
{
  "question": {
    "id": "1",
    "text": "What is the question?"
  },
  "answers": [
    {
      "id": "1",
      "text": "Answer 1"
    },
    {
      "id": "2",
      "text": "Answer 2"
    },
    ...
  ],
  "results": [
    null,
    {
      "num_responses": 2,
      "percent": 100
    }
  ]
}
```

Upload data
----------------

* `POST /upload` populates Redis database with data stored in static js file

**Request:**

``` json
{
  token: string
}
```

**Response:**

```
null | false

```
