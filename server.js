const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
require('dotenv/config');
const formidable = require('formidable');
const mv = require('mv');

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'))
})

app.post('/upload-video', function(req, res, next) {
  const formData = new formidable.IncomingForm();
  formData.maxFileSize = 1000 * 1024 * 1024;
  formData.parse(req, function(error, fields, files){
    if(error){
      next(error);
    }
    if( !files.video || files.video.size === 0 ){
      const customError = new Error('Video not found!');
      customError.statusCode = 401;
      next(customError);
    }
    if( files.video && files.video.path && files.video.size > 0){
      const oldPathVideo = files.video.path;
      const newPath = "assets/videos/" + new Date().getTime() + "-" + files.video.name;
      mv(oldPathVideo, newPath, function(err) {
        if (err) {  next(err); }
          res.json({
            "status": "200",
            "message": "Successfully uploaded!",
            "videoUrl": newPath,
          });
      });
    }
   
    // fs.rename(oldPathVideo, newPath, function(error){
    //   if(!error){
    //     res.json({
		// 			"status": "200",
    //       "message": "Successfully uploaded!",
    //       "videoUrl": newPath,
		// 		});
    //   }
    // });
  }); 
})


app.delete('/delete-video', function(req, res, next) {
  const path = req.query.videoUrl;
  if( !path){
    const customError = new Error("videoUrl is missing!");
    customError.statusCode = 401;
    next(customError);
  }
  fs.unlink(path, function (err) {
    if (err) next(err);
    else{
      res.json({
        "status": "200",
        "message": `Successfully delete video`,
        "videoUrl": path,
      });
    }
});
})

app.get('/play-video', function(req, res) {
  // const path = 'assets/sample.mp4'
  const path = req.query.videoUrl;
  if( !path){
    const customError = new Error("videoUrl is missing!");
    customError.statusCode = 401;
    next(customError);
  }
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1

    if(start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n'+start+' >= '+fileSize);
      return
    }
    
    const chunksize = (end-start)+1
    const file = fs.createReadStream(path, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }

    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
})


//Catching error and setting variable in response of the request
app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message,  error: true, data: data });
});


app.listen(9100, function () {
  console.log(`Listening on port 9100`)
})
