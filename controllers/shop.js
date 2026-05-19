const Product = require("../models/product");
// const Order = require("../models/order");

exports.getProducts = (req, res, next) => {
  Product.fetchAll()
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All products",
        path: "/products",
        hasProducts: products.length > 0,
        activeShop: true,
        productCSS: true,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  console.log("getProduct called with ID:", prodId);
  Product.findById(prodId)
    .then((product) => {
      console.log("Product found:", product);
      if (!product) {
        return res.redirect("/products");
      }
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      console.log("Error in getProduct:", err);
      res.status(500).send("Error loading product");
    });
};

exports.getIndex = (req, res, next) => {
  Product.fetchAll()
    .then((products) =>
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
      }),
    )
    .catch((err) => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .getCart()
    .then((products) => {
      console.log(products);

      res.render("shop/cart", {
        pageTitle: "Your cart",
        path: "/cart",
        products: products,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteProductFromCartById(prodId)
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log(err);
    });
};
// exports.getCheckout = (req, res, next) => {
//   res.render("shop/checkout", {
//     path: "/checkout",
//     pageTitle: "Checkout",
//   });
// };

// exports.postCartDeleteProduct = (req, res, next) => {
//   const productId = req.body.productId;
//   req.user
//     .getCart()
//     .then((cart) => {
//       return cart.getProducts({ where: { id: productId } });
//     })
//     .then((products) => {
//       const product = products[0];
//       return product.cartItems.destroy();
//     })
//     .then((result) => {
//       console.log(result);
//       res.redirect("/cart");
//     })
//     .catch((err) => {
//       console.log(err);
//     });
//   // const productPrice = req.body.productPrice;
//   // Cart.deleteProduct(productId, productPrice);
//   // res.redirect("/cart");
// };

// exports.postOrder = (req, res, next) => {
//   let fetchedCart;
//   req.user
//     .getCart()
//     .then((cart) => {
//       fetchedCart = cart;
//       return cart.getProducts();
//     })
//     .then((products) => {
//       return req.user
//         .createOrder()
//         .then((order) => {
//           return order.addProducts(
//             products.map((product) => {
//               product.orderItem = { quantity: product.cartItems.quantity };
//               return product;
//             })
//           );
//         })
//         .catch((err) => console.log(err));
//     })
//     .then((result) => {
//       return fetchedCart.setProducts(null);
//     })
//     .then((result) => {
//       res.redirect("/orders");
//     })
//     .catch((err) => console.log(err));
// };

// exports.getOrders = (req, res, next) => {
//   req.user
//     .getOrders({ include: ["products"] })
//     .then((orders) => {
//       console.log("this is the get orders request", orders);
//       res.render("shop/orders", {
//         pageTitle: "Orders",
//         path: "/orders",
//         orders: orders,
//       });
//     })
//     .catch((err) => console.log(err));
// };
