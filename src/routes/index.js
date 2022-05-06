require('dotenv').config();
const {KEY_API} = process.env;
const { Router } = require('express');
const axios = require('axios');
const {Videogame, Genre} = require('../db')
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');


const router = Router();
let apiLink = `https://api.rawg.io/api/games?key=${KEY_API}`

const listGamesFromApi = async (apiLink = `https://api.rawg.io/api/games?key=${KEY_API}`) => {
    const rawData = await axios.get(apiLink);
    const filteredData = await rawData.data.results.map((g) => {
        return {
            id: g.id,
            name: g.name,
            description: g.description,
            released: g.released,
            rating: g.rating,
            image: g.background_image,
            platforms: g.platforms.map((p) => {return p.platform.name}),
            genres: g.genres.map((genres) => {return genres.name}),
            createdInDb: "false"
        }
    });
    return filteredData;
}

const listGamesFromDb = async () => {
    return await Videogame.findAll({
        include: {
            model: Genre,
            attributes: ['name'],
            through: { attributes: [],
            },
        }
    })
}

const listAllGames = async () => {
    
    const gamesFromApi = [
        await listGamesFromApi(apiLink + "&page=1" ),
        await listGamesFromApi(apiLink + "&page=2" ),
        await listGamesFromApi(apiLink + "&page=3" ),
        await listGamesFromApi(apiLink + "&page=4" ),
        await listGamesFromApi(apiLink + "&page=5" ),
     ]
    const mergedGames = gamesFromApi.flat(1);
    const gamesFromDb = await listGamesFromDb();
    const allGames = mergedGames.concat(gamesFromDb);
    return allGames;
}

router.get('/videogames', async (req, res) => {
    const name = req.query.name
    let allVideogames = await listAllGames();
    let localGames = await listGamesFromDb();
    if(name){
        // let gameName = await localGames.filter((g) => g.name.toLowerCase().includes(name.toLowerCase()))
        let gameNameFromApi = await axios.get(`https://api.rawg.io/api/games?search=${name}&key=${KEY_API}`)
        // let gameNameFromApiRaw = gameNameFromApi.data.results
        let fullArray = gameNameFromApi.data.results
        fullArray.flat(1)
        console.log(fullArray)
        fullArray ? res.status(200).send(fullArray) : res.status (404).send('Videogame was not found.')

    } else { res.status(200).send(allVideogames) }
})

router.get('/videogame/:idVideogame', async (req, res) => {
    const paramsId = req.params.idVideogame;
    const allVideogames = await listAllGames();
    if(paramsId){
        let gameId = await allVideogames.filter((g) => g.id == paramsId)
        gameId.length ? res.status(200).send(gameId) : res.status(404).send("No game was found.")
    };
});

router.get("/addGameDetails/:gameId", async (req, res) => {
    try{
    const allVideogames = await listAllGames();
    const paramsId = req.params.gameId;
    if(req.params.gameId.length < 5) {
        const paramsId = req.params.gameId;
        let arr = [];
        const game = await axios.get(`https://api.rawg.io/api/games/${paramsId}?key=${KEY_API}`)
        arr.push(game.data)
        console.log(arr)
        const filteredDataDetails = await arr.map((g) => {
            return {
                id: g.id,
                name: g.name,
                description: g.description_raw,
                released: g.released,
                rating: g.rating,
                image: g.background_image,
                platforms: g.platforms.map((p) => {return p.platform.name}),
                genres: g.genres.map((genres) => {return genres.name}),
                createdInDb: "false"
            }
        });
        return filteredDataDetails ? res.status(200).json(filteredDataDetails) : res.status(404).send("No game was found.")
    } else {
        console.log('bdFilter')
        let gameId = await allVideogames.filter((g) => g.id == paramsId)
        gameId.length ? res.status(200).send(gameId) : res.status(404).send("No game was found.")
    }
} catch(error) {console.log(error, 'here') }
    
})

router.get('/genres', async (req, res) => {
    const rawApiData =  await axios.get(`https://api.rawg.io/api/genres?key=${KEY_API}`)
    console.log(rawApiData)
    const filteredApiData = rawApiData.data.results.map((g) => g.name) 
    filteredApiData.forEach(g => {
        Genre.findOrCreate({
             where: { name: g }
        })
    })
    const allGenres = await Genre.findAll();
    console.log(allGenres)
    res.send(allGenres);
})

router.post('/videogame', async (req, res) => {
    const  { name, description, releaseDate, rating, platforms, genre, image, createdInDb } = req.body
    const postedVideogame = await Videogame.create({ name, description, releaseDate, rating, platforms, image, createdInDb })
    let genreInDb = await Genre.findAll({
        where: {name : genre}
    });
    postedVideogame.addGenre(genreInDb)
    res.send('Videogame successfully created')
});

router.get("/allGamePlataforms", async (req, res) => {
    const allGamePlataforms = [];
    const games = await listGamesFromApi();
    games.map(g => {
        g.platforms.map(p => {
            if(!allGamePlataforms.includes(p)) {
                allGamePlataforms.push(p)
            }
        })
    })
    allGamePlataforms.length ? res.status(200).json(allGamePlataforms) 
    : res.status(404).send('Error, no plataforms found')
})

router.delete("/deleteVideogame/:idGame", async (req, res) => {
    try{
        if(req.params.idGame.length > 6) {
            const paramsId = req.params.idGame;
            const gameToDelte = await Videogame.findOne({ where: {id: paramsId}})
            if(gameToDelte) {
                await gameToDelte.destroy();
                return res.status(200).send('Game successfully deleted')
            } else {
                return res.status(404).send('No game was found')
            }
        } else {
            return res.status(404).send('No database game was found')
        }
    } catch(error) {console.log('error delete')}
})



module.exports = router;
