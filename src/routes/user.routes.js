

import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChennelProfile, getWatchHistory, refreshAccessToken, updateAccountDetails, userAvatarUpdate, userCoverImgUpdate, userLogin, userLogOut, userRegister } from "../controllers/user.controllers.js";
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

    router.route('/logout').post(verifyJWT ,userLogOut);

    router.route("/refresh-token").post(refreshAccessToken);

    router.route("/change-password").post(verifyJWT, changeCurrentPassword);

    router.route("/current-user").get(verifyJWT, getCurrentUser);

    router.route("/udpate-account-details").patch(verifyJWT, updateAccountDetails);

    router.route("/avatar").patch(verifyJWT, upload.single("avatar"), userAvatarUpdate);

    router.route("/coverImage").patch(verifyJWT, upload.single("/coverImage"), userCoverImgUpdate);

    router.route("/c/:name").get(verifyJWT, getUserChennelProfile);

    route.route("/history").get(verifyJWT, getWatchHistory)

export default router;

