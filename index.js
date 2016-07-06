const promise = require('promise');
const MongoClient = require("mongodb").MongoClient;
const fs = require('fs');
const PNG = require('pngjs').PNG;
var db = null;

MongoClient.connect("mongodb://localhost/Markov", function(error, database) {
	if (error) throw error;
	//Connection à la base de données 'Markov'

	db = database;

	const w = 5;
	const h = 5;

	makePicture(w, h, function(data)
	{
		data = convertData(data);
		outputPNG(data, w, h, 'out.png', function()
		{
			process.exit();
		});
	});

	

	//tryPicture('img.png');
});

function tryPicture(img)
{
	fs.createReadStream(img)
	.pipe(new PNG({
		filterType: 4
	}))
	.on('parsed', function() {

		let pixels = [];

		for (let y = 0, ny = this.height; y < ny; y++) {
			pixels[y] = new Array(this.width);
			for (let x = 0, nx = this.width; x < nx; x++) {
				i = x + y * this.width;

				pixels[y][x] = {r: this.data[i], g: this.data[i+1], b: this.data[i+2]};

			}
		}

		let toSend = [];

		i = 0;
		for (let y = 0, ny = this.height; y < ny; y++) {
			for (let x = 0, nx = this.width; x < nx; x++) {
				let ici = pixels[y][x];

				if(y > 0)
				{
					haut = pixels[y-1][x];
				}else{
					haut = null;
				}
				if(y > 1)
				{
					hauthaut = pixels[y-2][x];
				}else{
					hauthaut = null;
				}
				if(y > 2)
				{
					hauthauthaut = pixels[y-3][x];
				}else{
					hauthauthaut = null;
				}

				if(x > 0)
				{
					gauche = pixels[y][x-1];
				}else{
					gauche = null;
				}
				if(x > 1)
				{
					gauchegauche = pixels[y][x-2];
				}else{
					gauchegauche = null;
				}
				if(x > 2)
				{
					gauchegauchegauche = pixels[y][x-3];
				}else{
					gauchegauchegauche = null;
				}

				toSend.push({haut: haut, hauthaut: hauthaut, hauthauthaut: hauthauthaut, ici: ici, gauche: gauche, gauchegauche: gauchegauche, gauchegauchegauche: gauchegauchegauche});
				i++;	
			}
		}
		db.collection("pixels").insert(toSend, null, function (error, results) {
			if (error) throw error;

			process.exit();
		});
	});
}

function async(func)
{
	setTimeout(func, 1);
}

function makePicture(w, h, callback)
{
	let data = [];
	for(g = 0, ng = h; g < ng; g++)
	{
		data[g] = [];
	}

	findRangee(0, w+h, w, h, data, callback);
}

function findRangee(a, na, w, h, data, callback)
{
	let promesses = [];

	for(b = 0; b < a+1; b++)
	{
		c = a-b;
		if(b < w && c < h)
		{
			let ma_promesse = findPixel(b, c, data).then(function(retour){
				data[retour.y][retour.x] = retour.results[0].ici;
			})
			promesses.push(ma_promesse);
		}
	}

	Promise.all(promesses).then(function() {
		if(a < na)
		{
			findRangee(a+1, na, w, h, data, callback);
		}else{
			callback(data);
		}
	}).catch(function(error)
	{
		console.log(error);
	});
}

function findPixel(x, y, data, force)
{
	return new Promise(function (resolve, reject) {
		let objToFind = {};
		if(force == null)
		{
			if(y > 0)
			{
				objToFind['haut'] = data[y-1][x];
				if(y > 1)
				{
					objToFind['hauthaut'] = data[y-2][x];
					if(y > 2)
					{
						objToFind['hauthauthaut'] = data[y-3][x];
					}else{
						objToFind['hauthauthaut'] = null;
					}
				}else{
					objToFind['hauthaut'] = null;
				}
			}else{
				objToFind['haut'] = null;
			}
			if(x > 0)
			{
				objToFind['gauche'] = data[y][x-1];
				if(x > 1)
				{
					objToFind['gauchegauche'] = data[y][x-2];
					if(x > 2)
					{
						objToFind['gauchegauchegauche'] = data[y][x-3];
					}else{
						objToFind['gauchegauchegauche'] = null;
					}
				}else{
					objToFind['gauchegauche'] = null;
				}
			}else{
				objToFind['gauche'] = null;
			}
		}

		let yourRandomNumber = Math.floor(Math.random() * 30000);
		db.collection("pixels").find(objToFind).limit(1).skip(yourRandomNumber).toArray(function (error, results) {
			if (error) throw error;

			if(results.length == 0)
			{
				findPixel(x, y, data, 1).then(function(retour){
					resolve(retour);
				});
			}else{
				resolve({results:results, x:x, y:y});
			}
		});
	});
}

function convertData(data)
{
	let donnees = [];
	for(y = 0, ny = data.length; y < ny; y++)
	{
		if(data[y] != null)
		{
			for(x = 0, nx = data[y].length; x < nx; x++)
			{
				if(data[y][x] != null)
				{
					donnees.push(data[y][x].r);
					donnees.push(data[y][x].g);
					donnees.push(data[y][x].b);
					donnees.push(255);
				}
			}
		}
	}

	return donnees;
}

function outputPNG(data, width, height, filename, callback)
{
	let png = new PNG({
		width: width,
		height: height,
		filterType: -1
	});

	for (let y = 0; y < data.length; y+=4) {
		png.data[y  ] = data[y  ];
		png.data[y+1] = data[y+1];
		png.data[y+2] = data[y+2];
		png.data[y+3] = data[y+3];
	}

	let writer = fs.createWriteStream(filename);

	writer.on('finish', () => {
		if(callback != null)
			callback(true);
	});

	png.pack().pipe(writer);
}