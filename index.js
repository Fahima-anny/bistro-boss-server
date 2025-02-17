const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { ObjectId } = require('mongodb');
require('dotenv').config()
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY) ;
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


app.use(cors());
app.use(express.json());

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
    // await client.connect();

    const menuCollection = client.db("bistroDB").collection("menu");
    const userCollection = client.db("bistroDB").collection("users");
    const reviewCollection = client.db("bistroDB").collection("reviews");
    const cartCollection = client.db("bistroDB").collection("carts");
    const paymentCollection = client.db("bistroDB").collection("payments");

    // jwt related API 
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
      res.send({ token });
    })


    // all users here 
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const userExists = await userCollection.findOne(query);
      if (userExists) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      })
      // next() ;
    }

    // use verify admin after verufy token 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    }

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    // all menu here 
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    })

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await menuCollection.insertOne(data);
      res.send(result);
    })

    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          price: item.price,
          recipe: item.recipe,
          category: item.category,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updatedDoc);
      // res.send(result) ;
    })

    app.delete('/menu/:id', async (req, res) => {
      const id = req.params.id;
      // console.log("delete id = ", id);
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/menuItem", async (req, res) => {
      const count = await menuCollection.estimatedDocumentCount();
      res.send({ count });
    })


    // all reviews here 
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })


    // all carts here 
    app.post("/carts", async (req, res) => {
      const query = req.body;
      const result = await cartCollection.insertOne(query);
      res.send(result);
    })

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(filter);
      res.send(result);
    })



    // payment intent 
    app.post("/create-payment-intent", async (req, res) => {
      // console.log(req.body);
      const { price } = req.body;
      // console.log("price = ", price);

      if (price < 0.5) {
        return res.status(400).send({ message: "Amount must be at least $0.50" });
      }
      const amount = parseInt(price * 100);
      // console.log("Amout in payment = ", amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.json({ clientSecret: paymentIntent.client_secret })
    })

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // carefully delete each item from cart 
      console.log("Payment Info = ", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      console.log(req.params.email);
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    // stats or analytics
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way (bc it load all data)
      // const payments = await paymentCollection.find().toArray() ;
      // const revenue = payments.reduce((total, payment) => total + payment.price , 0)

      // better way 
      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null ,
           totalRevenue : {
             $sum : '$price'
           }
          }
        }
      ]).toArray() ;

      const revenue = result.length > 0 ? result[0].totalRevenue : 0 ;

      res.send({ users, menuItems, orders, revenue });
    })

    app.get("/order-stats", verifyToken, verifyAdmin, async(req, res) => {
      const result = await paymentCollection.aggregate([
        {
          $unwind: "$menuItemIds"
        },
        {
          $addFields: {
            menuItemObjectId: { $toObjectId: "$menuItemIds" } // Convert string to ObjectId
          }
        },
        {
          $lookup: {
            from : 'menu',
            localField : 'menuItemObjectId',
            foreignField : '_id',
            as : 'menuItems'
          }
        },
        {
          $unwind : "$menuItems" 
        },
        {
          $group : {
            _id : '$menuItems.category',
            quantity: { $sum : 1 },
            revenue :{ $sum : "$menuItems.price"}
          }
        },
        {
          $project : {
            _id : 0,
            category: "$_id" ,
            quantity: "$quantity",
            revenue: "$revenue"
          }
        }
      ]).toArray() ;
      res.send(result) ;
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Bistro Boss running on port = ${port}`);
})





