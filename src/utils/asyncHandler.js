const asyncHandler = (requesHandler) => {
    (req, res, next)   => {
        Promise.resolve(requesHandler(req, res, next))
        .catch((error) => {
            next(error )
        })
    }

}

export default asyncHandler;

// HOC (Higher Order Function) for handling async errors in Express routes
//const asyncHandler = (fn) => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         await fn(req, res, next)

//     }catch(error){
//         res.status(error.code || 500).joson({
//             success: false,
//             message: error.message || "Internal Server Error",
//         })

//     }
// }