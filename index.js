const express = require('express');
const cors = require('cors');
const app = express() ;
const port = process.env.PORT || 5000 ;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()


app.use(cors()) ;
app.use(express.json()) ;

app.get("/", (req, res) => {
    res.send("Bistro boss running successfully");
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ohdc4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const menuCollection = client.db("bistroDB").collection("menu");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");


    // all menu here 
    app.get("/menu", async (req, res) => {
        const result = await menuCollection.find().toArray() ;
        res.send(result) ;
    })

    app.get("/menuItem", async(req, res) => {
        const count = await menuCollection.estimatedDocumentCount() ;
        res.send({count}) ;
    })


    // all reviews here 
    app.get("/reviews", async (req, res) => {
        const result = await reviewCollection.find().toArray() ;
        res.send(result) ;
    })


    // all carts here 
  app.post("/carts", async(req, res) => {
    const query = req.body ;
    const result = await cartCollection.insertOne(query) ;
    res.send(result) ;
  })

  app.get("/carts", async(req, res) => {
    const result = await cartCollection.find().toArray() ;
    res.send(result) ;
  })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, ()=> {
    console.log(`Bistro Boss running on port = ${port}`);
})





