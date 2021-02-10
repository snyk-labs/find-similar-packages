const fetchKeys = require('fetch-package-keywords');
const top = require('top-packages-category-wise');
const RegClient = require('silent-npm-registry-client');

const topSelectSize = 100; // how many packages to fetch for given keyword/category
const defaultResultSize = 3;

function sortToArray(map) {
    var list = [], map2 = {}, maxIndex = 0;

    map.forEach(function (score, package) {
        var pa = map2[score];

        if (!pa)
            pa = [];
            map2[score] = pa;

        pa.push(package);

        if (score > maxIndex)
            maxIndex = score;
    });

    for (var i = maxIndex; i >= 1; i--) {
        var pa = map2[i];

        if (pa)
            Array.prototype.push.apply(list, pa);
    }


    return list;
}

function similarEnoughToSkip(inputPkgDetails, candidatePkgDetails) {
    // first we check if its smth like 'yorkie' and '@anejs/yorkie', in which case
    // its highly likely they are just forks
    let pkg1Name = inputPkgDetails.name;
    let pkg2Name = candidatePkgDetails.name;
    if (pkg1Name.includes('/')) {
        pkg1Name = pkg1Name.split("/")[1]
    }
    if (pkg2Name.includes('/')) {
        pkg2Name = pkg2Name.split("/")[1]
    }
    if (pkg1Name === pkg2Name) {
        return true;
    }

    // secondly we check if they come from the same repository name, in which case we will also skip (likely forks)
    if ('repository' in inputPkgDetails && 'repository' in candidatePkgDetails.links) {
        let inputPkgUrl = inputPkgDetails.repository.url
            .replace("git+", "")
            .replace(".git", "");

        let inputPkgRepoName = inputPkgUrl.split("/").pop();

        let candidatePkgUrl = candidatePkgDetails.links.repository;
        let candidatePkgRepoName = candidatePkgUrl.split("/").pop();

        if (inputPkgRepoName === candidatePkgRepoName) {
            return true;
        }
    }
    // if repository not available, use homepage to instead
    else if ('homepage' in inputPkgDetails && 'homepage' in candidatePkgDetails.links) {
        if (inputPkgDetails.homepage === candidatePkgDetails.links.homepage) {
            return true;
        }
    }

    return false;
}


function fetchPkgDetails(pkgName) {
    let options = { timeout: 1000 };
    const client = new RegClient();
    return new Promise((resolve, reject) => {
        client.get('https://registry.npmjs.org/' + packageName, options, function (error, data, raw, res) {
            if (error)
                reject(error);

            resolve(JSON.parse(raw));
        });
    });
}


function findSimilar(inputPkgName, size) {
    return new Promise((resolve, reject) => {
        if (!size) {
            size = defaultResultSize;
        }

        var similar = new Map();

        fetchPkgDetails(inputPkgName).then(function (inputPkgDetails) {
            let keys = (inputPkgDetails.keywords ? inputPkgDetails.keywords : []);
            if (!keys || keys.length === 0) {
                resolve([]);
            }

            // got keywords for package
            var remainKeys = keys.length;

            keys.forEach(function (key) {

                let options = {
                    fullPackageDetail: true
                };

                top(key, topSelectSize, options).then(function (pkgs) {

                    pkgs.forEach(function (candidatePkgDetails) {
                        if (candidatePkgDetails.name === inputPkgName) {
                            return;
                        }

                        if (similarEnoughToSkip(inputPkgDetails, candidatePkgDetails)) {
                            return;
                        }

                        var existing = similar.get(candidatePkgDetails.name);
                        similar.set(candidatePkgDetails.name, existing ? ++existing : 1);
                    });

                    if (--remainKeys === 0) {
                        let output = sortToArray(similar);
                        output = output.slice(0, size);
                        resolve(output);
                    }
                });
            });
        }).catch((error) => { reject(error); });

    });
}

let inputArgs = process.argv.slice(2);
let packageName = inputArgs[0];
findSimilar(packageName).then(function (packages) {
    console.log(packages);
}).catch(function (error) {
    console.log(error);
});

