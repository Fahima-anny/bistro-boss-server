const express = require('express');
const cors = require('cors');
const app = express() ;
const port = process.env.PORT || 5000 ;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollection = client.db("bistroDB").collection("users");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");


// all users here 
app.post("/users", async(req, res) => {
  const user = req.body ;
  const query = {email: user.email} ;
  const userExists = await userCollection.findOne(query) ;
  if(userExists){
    return res.send({message: "User already exists", insertedId: null}) ;
  }

const result = await userCollection.insertOne(user) ;
res.send(result) ;
})

app.get("/users", async(req, res) => {
const result = await userCollection.find().toArray() ;
res.send(result) ;
})

app.delete("/users/:id", async(req, res) => {
  const id = req.params.id ;
  const query = {_id: new ObjectId(id)} ;
  const result = await userCollection.deleteOne(query) ;
  res.send(result) ;
})

app.patch('/users/admin/:id', async( req, res) => {
  const id = req.params.id ;
  const filter = {_id: new ObjectId(id)} ;
  const updatedDoc = {
    $set : {
      role: 'admin'
    }
  }
  const result = await userCollection.updateOne(filter, updatedDoc) ;
  res.send(result) ;
})


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
    const email = req.query.email ;
    const query = {email: email} ;
    const result = await cartCollection.find(query).toArray() ;
    res.send(result) ;
  })

  app.delete("/carts/:id", async(req, res) => {
    const id = req.params.id ;
    const filter = {_id : new ObjectId(id)} ;
    const result = await cartCollection.deleteOne(filter) ;
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





