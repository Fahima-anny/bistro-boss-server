const express = require('express');
const cors = require('cors');
const app = express() ;
const port = process.env.PORT || 5000 ;

app.use(cors()) ;
app.use(express.json()) ;

app.get("/", (req, res) => {
    res.send("Bistro boss running successfully");
})

app.listen(port, ()=> {
    console.log(`Bistro Boss running on port = ${port}`);
})





