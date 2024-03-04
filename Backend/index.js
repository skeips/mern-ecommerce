const port = 4000;

const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
// const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { request } = require("http");

app.use(express.json());
app.use(cors());

//Database connection with mongodb
mongoose.connect("mongodb+srv://skeipsdev:9813139858@cluster0.yzirj9t.mongodb.net/e-commerce")

// API Creation

app.get("/", (req, res) => {
    res.send("Express app is running");
})

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
})

const upload = multer({
    storage: storage
})

//creating upload  endpoint for images

app.use('/images', express.static('upload/images'))
app.post("/upload", upload.single('product'), (req, res) => {
    // const file = req.file;
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
})

//Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now(),
    },
    available: {
        type: Boolean,
        default: true,
    }
    
})

app.post("/addproduct", async(req, res) => {
    let products = await Product.find({});
    let id;
    if(products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Product Added Successfully");
    res.json({
        success: true,
        name:req.body.name,
    });

})

//creating API for deleting products    
app.post("/removeproduct", async(req, res) => {
    await Product.findOneAndDelete({
        id: req.body.id,        
    })
    console.log("Product Deleted Successfully");
    res.json({success: true, name: req.body.name});
    
})

//Creating API for getting all products
app.get("/allproducts", async(req, res) => {
    let products = await Product.find({});
    // console.log("All Products Fetched Successfully");
    res.send(products);
    
})

//creating endpoint for Users

const Users = mongoose.model("Users", {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,        
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now(),
    }
})

//Creating endpoint for registering the user

app.post("/signup", async(req, res) => {
    let check = await Users.findOne({email: req.body.email});
    if(check) {
        return res.status(400).json({
            success: false,
            errors: "User already exists",
        })
    }
    let cart ={};
    for (let i = 0; i < 300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({
        success: true,
        token
    })
    
})

//Creating endpoint for login
app.post("/login", async(req, res) => {
    const user = await Users.findOne({email: req.body.email});
    const useremail = user.email;
    console.log (useremail)
    
    if(user) {
        const passComapare = req.body.password === user.password;
        if(passComapare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            
            res.json({
                success: true,
                token,
                useremail
                
                
            })
        }
        else {
            res.json({
                success: false,
                errors: "Incorrect Password",
            })
        }
        
    }else {
        res.json({
            success: false,
            errors: "Incorrect Email",
        })
    }
})

//Creating endpoint for newCollection data
app.get("/newcollections", async(req, res) => {
    let products = await Product.find({});
    let newCollection = products.slice(1).slice(-8);
    res.send(newCollection);
})

//Creating endpoint for popular in women section
app.get("/popularinwomen", async(req, res) => {
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    res.send(popular_in_women);   
})

//creating middleware to fetch user
const fetchUser = async(req, res, next) => {
    const token = req.header('auth-token');
    if(!token) {
        res.status(401).send("Access Denied");
    }
    else{
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send("Invalid Token");            
        }
    }
}

//creating endpoint for adding products in cartdata
app.post("/addtocart", fetchUser, async(req, res) => {
    console.log("Added", req.body.itemId);
    let userData = await Users.findById({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData: userData.cartData});
    res.send("Added to cart");
})

//creating endpoint for removing products in cartdata
app.post("/removefromcart", fetchUser, async(req, res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findById({_id:req.user.id});
    
    if(userData.cartData[req.body.itemId] > 0) {
        userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData: userData.cartData});
    res.send("Removed to cart");
})


//creating endpoint to get cartdata
app.post("/getcart", fetchUser, async(req, res) => {
    console.log("getCart")
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
    
})


app.listen(port, (error) => {
    if(!error) {
        console.log("Server is Successfully Running, and App is listening on port " + port);
    }
    else {
        console.log("Error occurred, server can't start", error);
    }
    
})