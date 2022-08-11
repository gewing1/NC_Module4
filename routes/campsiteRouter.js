const express = require('express');
const Campsite = require('../models/campsite');
const authenticate = require('../authenticate');

const campsiteRouter = express.Router();

campsiteRouter.route('/')
.get((req, res, next) => {
    Campsite.find()
    .populate('comments.author')
    .then(campsites => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsites);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.create(req.body)
    .then(campsite => {
        console.log('Campsite Created ', campsite);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /campsites');
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.deleteMany()
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}`);
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findByIdAndUpdate(req.params.campsiteId, {
        $set: req.body
    }, { new: true })
    .then(campsite => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(campsite);
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findByIdAndDelete(req.params.campsiteId)
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId/comments')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        if (campsite) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments);
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            req.body.author = req.user._id;
            campsite.comments.push(req.body);
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`PUT operation not supported on /campsites/${req.params.campsiteId}/comments`);
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
        if (campsite) {
            for (let i = (campsite.comments.length-1); i >= 0; i--) {
                campsite.comments.id(campsite.comments[i]._id).remove();
            }
            campsite.save()
            .then(campsite => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(campsite);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

campsiteRouter.route('/:campsiteId/comments/:commentId')
.get((req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .populate('comments.author')
    .then(campsite => {
        if (campsite && campsite.comments.id(req.params.commentId)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(campsite.comments.id(req.params.commentId));
        } else if (!campsite) {
            err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /campsites/${req.params.campsiteId}/comments/${req.params.commentId}`);
})
.put(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
////////// FIX 1.1: Right logic, wrong placememnt. It is better to first test and make sure we have both a campsite and a comment
// before testing for the author. I will switch the order of the these IF statements.
// OLD CODE:
/*
        if (campsite.comments.id(req.params.commentId).author._id.equals(req.user._id)) {
            if (campsite && campsite.comments.id(req.params.commentId)) {
*/
        if (campsite && campsite.comments.id(req.params.commentId)) {
            if (campsite.comments.id(req.params.commentId).author._id.equals(req.user._id)) {
////////// END FIX 1.1
                if (req.body.rating) {
                    campsite.comments.id(req.params.commentId).rating = req.body.rating;
                }
                if (req.body.text) {
                    campsite.comments.id(req.params.commentId).text = req.body.text;
                }
                campsite.save()
                .then(campsite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(campsite);
                })
                .catch(err => next(err));
////////// FIX 1.2: Just switching the order of your ELSE clauses to match the switched IFs above.
// Also note that I changed the status codes in all error messages to 403. The lessons incorrectly
// identified the errors as 404 (file not found) when they should be 403 (forbidden).
// OLD CODE:
/*
            } else if (!campsite) {
                err = new Error(`Campsite ${req.params.campsiteId} not found`);
                err.status = 404;
                return next(err);
            } else {
                err = new Error(`Comment ${req.params.commentId} not found`);
                err.status = 404;
                return next(err);
            }
        } else {
            err = new Error("You are not the author of the comment.");
            err.status = 403;
            return next(err);
        }
*/
            } else {
                const err = new Error("You are not the author of the comment.");
                err.status = 403;
                return next(err);
            }
        } else if (!campsite) {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 403;
            return next(err);
        } else {
            const err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 403;
            return next(err);
        }
////////// END FIX 1.2
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, (req, res, next) => {
    Campsite.findById(req.params.campsiteId)
    .then(campsite => {
////////// FIX 2.1: Same as the PUT request rules above. The order of these IFs should be switched.
// OLD CODE:
/*
        if (campsite.comments.id(req.params.commentId).author._id.equals(req.user._id)) {
            if (campsite && campsite.comments.id(req.params.commentId)) {
*/
        if (campsite && campsite.comments.id(req.params.commentId)) {
            if (campsite.comments.id(req.params.commentId).author._id.equals(req.user._id)) {
////////// END FIX 2.1
                campsite.comments.id(req.params.commentId).remove();
                campsite.save()
                .then(campsite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(campsite);
                })
                .catch(err => next(err));
////////// FIX 2.2: Switching the order of the ELSE clauses to match if IFs above. Also, I changed the status codes from 404 to 403.
// OLD CODE:
/*
            } else if (!campsite) {
                err = new Error(`Campsite ${req.params.campsiteId} not found`);
                err.status = 404;
                return next(err);
            } else {
                err = new Error(`Comment ${req.params.commentId} not found`);
                err.status = 404;
                return next(err);
            }
        } else {
            err = new Error("You are not the author of the comment.");
            err.status = 403;
            return next(err);
        }
*/
            } else {
                const err = new Error("You are not the author of the comment.");
                err.status = 403;
                return next(err);
            }
        } else if (!campsite) {
            const err = new Error(`Campsite ${req.params.campsiteId} not found`);
            err.status = 403;
            return next(err);
        } else {
            const err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 403;
            return next(err);
        }
//////////END FIX 2.2
    })
    .catch(err => next(err));
});

module.exports = campsiteRouter;