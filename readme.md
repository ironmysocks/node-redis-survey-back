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
    "id": integer,
    "text": string
  },
  "answers": [
    {
      "id": integer,
      "text": string
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
  answer_id: integer
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

This returns the question and answer content with results.

``` json
{
  "question": {
    "id": integer,
    "text": string
  },
  "answers": [
    {
      "id": integer,
      "text": string,
      "num_responses": integer,
      "percent": integer
    },
    ...
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
