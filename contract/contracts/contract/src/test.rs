#![cfg(test)]

use super::*;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_create_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let result = client.create_campaign(
        &creator,
        &String::from_str(&env, "Help Schools"),
        &String::from_str(&env, "Education for all children"),
    );

    assert!(result);

    let campaign = client.get_campaign(&String::from_str(&env, "Help Schools"));
    assert_eq!(campaign.title, String::from_str(&env, "Help Schools"));
    assert_eq!(
        campaign.description,
        String::from_str(&env, "Education for all children")
    );
    assert_eq!(campaign.creator, creator);
}

#[test]
fn test_donate_to_campaign() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Clean Water"),
        &String::from_str(&env, "Provide clean water"),
    );

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_id);

    // Mint tokens to donor
    token_client.mint(&donor, &1000);

    client.donate(
        &donor,
        &String::from_str(&env, "Clean Water"),
        &token_id,
        &100,
    );

    let total = client.get_total_raised(&String::from_str(&env, "Clean Water"));
    assert_eq!(total, 100);
}

#[test]
fn test_multiple_donors() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Food Drive"),
        &String::from_str(&env, "Feed the hungry"),
    );

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_id);

    token_client.mint(&donor1, &500);
    token_client.mint(&donor2, &300);

    client.donate(
        &donor1,
        &String::from_str(&env, "Food Drive"),
        &token_id,
        &200,
    );
    client.donate(
        &donor2,
        &String::from_str(&env, "Food Drive"),
        &token_id,
        &100,
    );

    let total = client.get_total_raised(&String::from_str(&env, "Food Drive"));
    assert_eq!(total, 300);

    let donations = client.get_donations(&String::from_str(&env, "Food Drive"));
    assert_eq!(donations.len(), 2);
}

#[test]
fn test_get_all_campaigns() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.create_campaign(
        &user1,
        &String::from_str(&env, "Campaign A"),
        &String::from_str(&env, "First campaign"),
    );

    client.create_campaign(
        &user2,
        &String::from_str(&env, "Campaign B"),
        &String::from_str(&env, "Second campaign"),
    );

    let campaigns = client.get_all_campaigns();
    assert_eq!(campaigns.len(), 2);
}

#[test]
fn test_get_donor_count() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Medical Fund"),
        &String::from_str(&env, "Help with medical bills"),
    );

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_id);

    token_client.mint(&donor1, &1000);
    token_client.mint(&donor2, &1000);

    client.donate(
        &donor1,
        &String::from_str(&env, "Medical Fund"),
        &token_id,
        &50,
    );
    client.donate(
        &donor2,
        &String::from_str(&env, "Medical Fund"),
        &token_id,
        &75,
    );

    let count = client.get_donor_count(&String::from_str(&env, "Medical Fund"));
    assert_eq!(count, 2);
}

#[test]
fn test_same_donor_multiple_donations() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Animal Shelter"),
        &String::from_str(&env, "Support stray animals"),
    );

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_id);

    token_client.mint(&donor, &2000);

    // Same donor can donate multiple times
    client.donate(
        &donor,
        &String::from_str(&env, "Animal Shelter"),
        &token_id,
        &100,
    );
    client.donate(
        &donor,
        &String::from_str(&env, "Animal Shelter"),
        &token_id,
        &150,
    );

    let total = client.get_total_raised(&String::from_str(&env, "Animal Shelter"));
    assert_eq!(total, 250);

    let count = client.get_donor_count(&String::from_str(&env, "Animal Shelter"));
    assert_eq!(count, 1); // Still 1 unique donor
}
