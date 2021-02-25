App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,

    init: function() {
        console.log('Initiated');
        return App.initWeb3();
    },

    initWeb3: function() {
        // TODO: refactor conditional
        // Portis DAPP ID: 05845472-c26d-4585-a111-c3da4b3eb85d
        if (typeof web3 !== 'undefined') {
            // If a web3 instance is already provided by Meta Mask.
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
            console.log('New Web3', web3);
        } else {
            // Specify default instance if no web3 instance provided
            console.log('Found Web3');
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
            // window.web3 = web3;
        }
        return App.initContract();
    },

    initContract: function() {
        $.getJSON("Election.json", (election) => {
            console.log('Contract initiated');
            // Instantiate a new truffle contract from the artifact
            App.contracts.Election = TruffleContract(election);
            // Connect provider to interact with contract
            App.contracts.Election.setProvider(App.web3Provider);

            App.listenForEvents();

            return App.render();
        });
    },

    // Listen for events emitted from the contract
    listenForEvents: async function() {
        var app = await App.contracts.Election.deployed();

        if(app) {
            console.log('Instance found');
        } else {
            console.log('Instance not found');
        }

        app.votedEvent({}, {
            fromBlock: 0,
            toBlock: 'latest'
        }).watch(function(error, event) {
            console.log("event triggered", event);
            // Reload when a new vote is recorded
            App.render();
        });

        // App.contracts.Election.deployed().then(function(instance) {
        //     // Restart Chrome if you are unable to receive this event
        //     // This is a known issue with Metamask
        //     // https://github.com/MetaMask/metamask-extension/issues/2393
        
        //     instance.votedEvent({}, {
        //         fromBlock: 0,
        //         toBlock: 'latest'
        //     }).watch(function(error, event) {
        //         console.log("event triggered", event);
        //         // Reload when a new vote is recorded
        //         App.render();
        //     });
        // });
    },

    render: async function() {
        var electionInstance;
        var candidatesCount;

        var loader = $("#loader");
        var content = $("#content");
        var candidatesResults = $("#candidatesResults");
        var candidatesSelect = $('#candidatesSelect');

        loader.show();
        content.hide();

        // Load account data
        var accounts = web3.eth.getAccounts();

        if(accounts) {
            console.log('Account FOUND: ', accounts);
            App.account = account;
            $("#accountAddress").html("Your Account: " + account);
        } else {
            console.log('Account not found.', accounts);
        }

        // Load contract data

        electionInstance = await App.contracts.Election.deployed();
        candidatesCount = await electionInstance.candidatesCount();

        if(candidatesCount) {
            console.log('No of candidates: ', candidatesCount.toString());
           
            candidatesResults.empty();
            candidatesSelect.empty();

            for (var i = 1; i <= candidatesCount; i++) {
                var candidate = await electionInstance.candidates(i);
                
                var id = candidate[0];
                var name = candidate[1];
                var voteCount = candidate[2];

                // Render candidate Result
                var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>";
                candidatesResults.append(candidateTemplate);

                // Render candidate ballot option
                var candidateOption = "<option value='" + id + "' >" + name + "</ option>";
                candidatesSelect.append(candidateOption);
            }

            electionInstance.voters(App.account);

            if(App.hasVoted) {
                $('form').hide();
            }
            loader.hide();
            content.show();
        
        } else {
            console.log('No candidates');
        }
    },

    castVote: async function() {
        var candidateId = $('#candidatesSelect').val();

        // var electionInstance = App.contracts.Election.deployed();
        // console.log('Voting account: ', App.account);
        // // return electionInstance.vote(candidateId, {from: App.account});
        // try {
        //     electionInstance.vote(candidateId, {from: App.account});
        //     $("#content").hide();
        //     $("#loader").show();
        // } catch(e) {
        //     console.log('Error while voting: ', e);
        // }

        App.contracts.Election.deployed().then(function(instance) {
            return instance.vote(candidateId, { from: App.account });
        }).then(function(result) {
            // Wait for votes to update
            $("#content").hide();
            $("#loader").show();
        }).catch(function(err) {
            console.log(err);
        });
    }
};

$(() => {
    $(window).load(() => {
        App.init();
    });
});
