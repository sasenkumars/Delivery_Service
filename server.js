const express = require('express');
const app = express();
const compression = require('compression');
const bodyParser = require('body-parser');
const http = require('http');
const mongodb = require('mongodb');
const mongClient = mongodb.MongoClient;

/**
 * @class Server
 * @description ExpressJS HTTP server & routes.
 */
class Server {
    constructor() {

        this._app = app;
        this._app.use(compression());
        this._app.use(bodyParser.json());
        this._app.use((err, req, res, next) => {
            if (err !== null) {
              return res.status(500).json({ success: false, error: "An internal error occurred.", errSys: err.toString() });
            }
            return next();
          });

    }

    /**
     * @name start
     * @description Initialize the server.
     * @returns {Promise<void>}
     */
    async start() {
        try{

            const client = await mongClient.connect(config.mongodbURL, {useNewUrlParser: true});
            global.db = client.db();
            global.ObjectID = (id) => new mongodb.ObjectID(id);
            global.typeDate = (date) => new mongodb.Timestamp(date);
            const orderModel = require('./model/order');
            
            this._app.all('/', (req, res) => {

                res.status(200).send('Use /order/:id or /orders');

            });

            this._app.post('/order', async (req, res) => {
                try {
                    if (typeof req.body.origin === 'object' && typeof req.body.destination === 'object') {

                        const place = await orderModel.place([req.body.origin[0], req.body.origin[1]], [req.body.destination[0], req.body.destination[1]]);                        
                        const status = place.httpStatus;
                        delete place.httpStatus;
                        res.status(status).json(place);

                    } else {

                        res.status(400).json({
                            success: false,
                            error: 'Please enter the origin<Array> and destination<Array> lat/long values.'
                        });

                    }

                } catch (ex) {
                    
                    return res.status(500).json({
                        success: false,
                        error: 'An internal error occurred.',
                        errSys: ex.toString()
                    });

                }
            });

            this._app.put('/order/:id', async (req, res) => {
                try {

                    const order_id = req.params.id || null;
                    const order_status = req.body.status || null;

                    if (order_id !== null && order_id.length < 10 && order_status !== null && order_status.length < 15) {

                        const take = await orderModel.take(order_id, order_status);
                        const status = take.httpStatus;
                        delete take.httpStatus;

                        res.status(status).json(take)

                    } else {

                        res.status(400).json({
                            success: false,
                            error: 'Order ID and/or status (max. length 15) fields could be incorrect.'
                        });

                    }

                } catch (ex) {

                    return res.status(500).json({
                        success: false,
                        error: 'An internal error occurred.',
                        errSys: ex.toString()
                    });

                }
            });

            this._app.get('/orders', async (req, res) => {
                try {

                    const page = parseInt(req.query.page) || 1;
                    const limit = parseInt(req.query.limit) || 10;
                    const list = await orderModel.list({page, limit});
                    const status = list.httpStatus;
                    delete list.httpStatus;

                    return res.status(status).json(list);

                } catch (ex) {

                    return res.status(500).json({
                        success: false,
                        error: 'An internal error occurred.',
                        errSys: ex.toString()
                    });

                }
            });

            this._app.all('*', (req, res) => {

                res.status(404).json({success: false, error: 'Invalid API endpoint.'})

            });

            const httpServer = http.createServer(this._app);
            httpServer.listen(config.port, () => console.log(`Listening: ${config.port}`));

        }catch(e){

            throw e;

        }
    }
}

module.exports = new Server().start();