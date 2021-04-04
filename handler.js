"use strict";

module.exports.hello = async function (event, context) {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  const {
    requestContext: { connectionId, routeKey },
  } = event;

  switch (routeKey) {
    case "$connect":
      console.log(connectionId);
      console.log(Date.now() / 1000 + 3600);

      break;

    case "$disconnect":
      console.log("disconnected");
      console.log(connectionId);

      break;
  }

  // Return a 200 status to tell API Gateway the message was processed
  // successfully.
  // Otherwise, API Gateway will return a 500 to the client.
  return { statusCode: 200 };
};
