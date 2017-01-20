const nexe = require('nexe');

console.dir(nexe)

nexe.compile({
  input: './index.js', // where the input file is
  output: './shell', // where to output the compiled binary
  nodeVersion: '7.4.0', // node version
  nodeTempDir: '.build', // where to store node source.
  // nodeTempDir: 'src', // where to store node source.
  // nodeConfigureArgs: ['opt', 'val'], // for all your configure arg needs.
  nodeMakeArgs: ["-j", "4"], // when you want to control the make process.
  // python: 'path/to/python', // for non-standard python setups. Or python 3.x forced ones.
  // resourceFiles: [ 'path/to/a/file' ], // array of files to embed.
  // resourceRoot: [ 'path/' ], // where to embed the resourceFiles.
  flags: true, // use this for applications that need command line flags.
  jsFlags: "--use_strict --harmony-async-await", // v8 flags
  framework: "node" // node, nodejs, or iojs
}, function(err) {
  if(err) {
    return console.log(err);
  }
});
