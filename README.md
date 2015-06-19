# LoopBack Connector for Google Cloud

## Installation

    npm install loopback-connector-gcloud

## Configuration

In order for the connector to load property, you have to add the gcloud definition into the database configuration
json file, usually found in ```/server/database.json```.

In a production Google Compute Engine environment, **projectId** is the only required property.

```json
"gcloud-datasource": {
    "name": "gcloud-datasource",
    "connector": "gcloud",
    "projectId": "<project-id-here>"
}
```

If you are running locally, and calling out to the Cloud DataStore over a network, then the **keyFilename** and **email** properties are also required. Email is the service email as provided by Google. See #here# in for information on how to configure a service client in the Google Developer Console.

```json
"gcloud-datasource": {
    "name": "gcloud-datasource",
    "connector": "gcloud",
    "projectId": "<project-id-here>",
    "keyFilename": "/path/to/your/secret-key.pem",
    "email": "<lots-of-numbers-from-your-service-email>@developer.gserviceaccount.com"
}
```
