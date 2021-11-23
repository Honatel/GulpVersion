const gulp = require("gulp");
const argv = require("minimist")(process.argv.slice(2));
const path = require("path");
const replace = require("gulp-replace");
const git = require('gulp-git');

var currentVersion;

// Tarefa responsavel por processar o versionamento.
gulp.task("ng-bump-version", function (done) {
    console.log('entrou');
    console.log(argv);
    const ng_env = argv["configuration"];
    const major = argv["major"] ?? 0;
    const minor = argv["minor"] ?? 0;
    const fix = argv["fix"] ?? 0;
    const env_dir_path = path.resolve(__dirname, './src/environments');
    const env_file_path = path.join(env_dir_path, `environment.${ng_env}.ts`);

    return gulp
        .src([env_file_path])
        .pipe(replace(/version:\s?'\d+.\d+.\d+.\d+',?/g, function (match) {
            const matches = /(version:\s?')(\d+.\d+.\d+.\d+)(',?)/g.exec(match);
            const version_string = matches[2];
            const version_parts = version_string.split(".");
            version_parts[0] = parseInt(version_parts[0]) + major;
            version_parts[1] = parseInt(version_parts[1]) + minor;
            version_parts[2] = parseInt(version_parts[2]) + fix;
            // sempre soma 1 a cada build
            version_parts[version_parts.length - 1]++;
            const new_version_string = version_parts.join('.');
            console.log('versão antiga', version_string);
            console.log('versão nova', new_version_string);

            const replaced_version_string = match.replace(version_string, new_version_string);
            console.log('versão replace', replaced_version_string);

            console.log(`${this.file.path} New version to be written: ${replaced_version_string}`);
            currentVersion = replaced_version_string;
            return replaced_version_string;
        }))
        .pipe(gulp.dest(env_dir_path))
});

// *********************************************************
// tarefas GIT 
// https://www.npmjs.com/package/gulp-git
// https://git-scm.com/docs/git-clean
// https://stackoverflow.com/questions/36188219/add-commit-and-push-at-once-using-gulp-git/36192075
// *********************************************************
gulp.task('git-clean', (done) => {
    console.log('cleaning directory...');
    git.clean({ args: '-f' }, function (err) {
        if (err) throw err;
    });
    done();
});

gulp.task('git-fetch-all', (done) => { git.fetch('', '', { args: '--all' }, (err) => { if (err) throw err; }); done(); });
gulp.task('git-pull', (done) => { git.pull(argv.o, argv.d, { args: '--rebase' }, (err) => { if (err) throw err; }); done(); });

gulp.task('git-checkout', (done) => {
    console.log('git checkouttttt', argv.b)
    git.checkout(`${argv.b}`, function (err) {
        if (err) throw err
    });
    done();
});

gulp.task('git-checkout-new', (done) => {
    console.log('create new branch', argv.b);
    git.checkout(`${argv.b}`, { args: '-b' }, function (err) { if (err) throw err });
    done();
});

gulp.task('git-add', async () => {
    console.log('adding files');
    return gulp.src('.').pipe(git.add());
});

gulp.task('git-commit', async () => {
    console.log('committing');
    if (argv.m) {
        return gulp.src('.').pipe(git.commit(argv.m));
    }
});

gulp.task('git-push', (done) => {
    console.log('pushing...');
    git.push('origin', argv.branch, function (err) {
        if (err) throw err;
    });
    done();
});

gulp.task('git-develop', function (done) {
    console.log('Clean files... Checkout of development... Fetch all...');
    gulp.series('git-clean', 'git-checkout -b=development', 'git-fetch-all', function () { done(); });
});

gulp.task('start-git', function () { gulp.series('git-develop', 'ng-bump-version', `git-checkout-new --b=version/${currentVersion}`, function () { done(); }); });

gulp.task('update', () => { gulp.series('git-add', `git-commit --m="Set new version ${currentVersion}`, `git-push --branch=version/${currentVersion}`, function () { done(); }) });

// Tarefa para limpar o repositorio, se possicionar na develop. 
// realizar um fetch 
// realizar um pull da branch

// Tarefa para criar uma nova branch de versionamento
// processar a mudança de versão

// Tarefa para adicionar arquivos alterados (environments somente)
// criar commit
// realizar push 
// --> chama a primeira task
// limpar a branch. 
// voltar para develop

gulp.task("update-version", async () => {
    console.log('Start update')
    return (
        gulp.series(
            'git-develop',
            // 'ng-bump-version',
            // `git-checkout-new --b='version/${currentVersion}'`,
            // 'git-add',
            // `git-commit --m="Set new version ${currentVersion}`,
            // `git-push --branch='version/${currentVersion}'`,
            // 'git-develop'
        )
    )();
})

// https://gulpjs.com/docs/en/getting-started/async-completion