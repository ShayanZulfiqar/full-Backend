

import { Router } from "express";
import { userLogin, userLogOut, userRegister } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    
    userRegister)

    router.route('/login').post(userLogin);

    //sercured routes

    router.route('/logout').post(verifyJWT ,userLogOut)

export default router;

