const util = require("util");
const {
  ApiGatewayManagementApi,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const sendMessageToClient = (url, connectionId, payload) =>
  new Promise((resolve, reject) => {
    const apigatewaymanagementapi = new ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: url,
    });

    console.log("[ApiGateway] Trying to post data from url: " + url);
    console.log("[ApiGateway] into the client id: " + connectionId);

    /**
     *
     * Workaround
     * Add stage to the path as a middleware
     *
     * @see https://github.com/aws/aws-sdk-js-v3/issues/1830
     *
     */
    apigatewaymanagementapi.middlewareStack.add(
      (next) => async (args) => {
        args.request.path = payload.requestContext.stage + args.request.path;

        console.log("path: " + args.request.path);
        return await next(args);
      },
      { step: "build" }
    );

    /**
     * Finally do the post connection to the desired @var ConnectionId, which is a websocket client(ws-client)
     */
    apigatewaymanagementapi.postToConnection(
      {
        ConnectionId: connectionId, // connectionId of the receiving ws-client
        /** Data to be sent */
        Data: JSON.stringify("Hi from server"),
      },
      (err, data) => {
        if (err) {
          reject(err);

          throw err;
        }

        resolve(data);
      }
    );
  });

module.exports.hello = async (event, context) => {
  const {
    body,
    requestContext: { connectionId, routeKey, domainName },
  } = event;

  const callbackUrlForAWS = process.env.IS_OFFLINE
    ? "http://localhost:3001"
    : util.format(util.format("https://%s/", domainName)); //construct the needed url

  switch (routeKey) {
    case "$connect":
      break;

    case "$disconnect":
      console.log("disconnected");
      console.log(connectionId);
      break;

    default:
      try {
        const res = await sendMessageToClient(
          callbackUrlForAWS,
          connectionId,
          event
        );

        console.log(res);
      } catch (error) {
        console.error(error);
      }

      break;
  }

  return {
    statusCode: 200,
  };
};
