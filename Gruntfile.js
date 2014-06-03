module.exports = function(grunt) {

    // Load tasks
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-external-daemon');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');


    grunt.initConfig({

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/server/*.js']
            }
        },

        env : {
            options : {
                //Shared Options Hash
            },
            dev : {
                NODE_ENV : 'development'
            },
            test : {
                NODE_ENV : 'test'
            }
        },

        nodemon: {
            dev: {
                script: 'index.js'
            },
            start: {
                script: 'server.js'
            }

        },

        clean: ["node_modules"],

        watch: {
            jade: {
                files: ['**/*.jade'],
                options: {
                    livereload: true
                }
            },
            js: {
                files: ['**/*.js', '!**/node_modules/**'],
                options: {
                    livereload: true
                }
            }
        },

        external_daemon: {
            redis: {
                cmd: 'redis-server'
            }
        },

        shell: {
            ulimit: {
                command: './ulimit.sh'
            }
        },

        concurrent: {
            serveAndWatch: {
                tasks: ['nodemon:start', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        jshint: {
            // define the files to lint
            files: ['**/*.js', '!**/node_modules/**'],
            // configure JSHint (documented at http://www.jshint.com/docs/)

            options: {
                // more options here if you want to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true
                }
            }
        }



    });

    grunt.registerTask('serverTests', ['env:test', 'mochaTest']);
    grunt.registerTask('test', ['env:test', 'serverTests']);
    grunt.registerTask('dev', ['env:dev', 'nodemon:dev']);
    grunt.registerTask('start', ['shell', 'external_daemon', 'concurrent:serveAndWatch']);
    grunt.registerTask('shelltest', ['shell']);

};
