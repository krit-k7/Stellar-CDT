#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Map, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub id: String,
    pub title: String,
    pub description: String,
    pub creator: Address,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Donation {
    pub donor: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Campaigns,
    Donations,
    Totals,
    CampaignIds,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn create_campaign(env: Env, creator: Address, title: String, description: String) -> bool {
        creator.require_auth();

        let mut campaigns: Map<String, Campaign> = env
            .storage()
            .instance()
            .get(&DataKey::Campaigns)
            .unwrap_or_else(|| Map::new(&env));

        let mut campaign_ids: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::CampaignIds)
            .unwrap_or_else(|| Vec::new(&env));

        let timestamp = env.ledger().timestamp();

        let campaign = Campaign {
            id: title.clone(),
            title: title.clone(),
            description,
            creator,
            created_at: timestamp,
        };

        campaigns.set(title.clone(), campaign);

        if !campaign_ids.contains(&title) {
            campaign_ids.push_back(title.clone());
        }

        env.storage()
            .instance()
            .set(&DataKey::Campaigns, &campaigns);
        env.storage()
            .instance()
            .set(&DataKey::CampaignIds, &campaign_ids);

        // Initialize empty donations and total for this campaign
        let mut donations: Map<String, Vec<Donation>> = env
            .storage()
            .instance()
            .get(&DataKey::Donations)
            .unwrap_or_else(|| Map::new(&env));
        donations.set(title.clone(), Vec::new(&env));
        env.storage()
            .instance()
            .set(&DataKey::Donations, &donations);

        let mut totals: Map<String, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Totals)
            .unwrap_or_else(|| Map::new(&env));
        totals.set(title, 0i128);
        env.storage().instance().set(&DataKey::Totals, &totals);

        true
    }

    pub fn donate(
        env: Env,
        donor: Address,
        campaign_id: String,
        token_addr: Address,
        amount: i128,
    ) {
        donor.require_auth();

        let donations: Map<String, Vec<Donation>> =
            env.storage().instance().get(&DataKey::Donations).unwrap();
        assert!(
            donations.contains_key(campaign_id.clone()),
            "Campaign not found"
        );

        // Transfer tokens from donor to this contract
        token::Client::new(&env, &token_addr).transfer(
            &donor,
            &env.current_contract_address(),
            &amount,
        );

        // Record donation
        let mut all_donations: Map<String, Vec<Donation>> =
            env.storage().instance().get(&DataKey::Donations).unwrap();

        let mut campaign_donations: Vec<Donation> = all_donations
            .get(campaign_id.clone())
            .unwrap_or_else(|| Vec::new(&env));

        let donation = Donation {
            donor: donor.clone(),
            amount,
            timestamp: env.ledger().timestamp(),
        };

        campaign_donations.push_back(donation);
        all_donations.set(campaign_id.clone(), campaign_donations);
        env.storage()
            .instance()
            .set(&DataKey::Donations, &all_donations);

        // Update total
        let mut totals: Map<String, i128> = env.storage().instance().get(&DataKey::Totals).unwrap();

        let current_total = totals.get(campaign_id.clone()).unwrap_or(0);
        totals.set(campaign_id, current_total + amount);
        env.storage().instance().set(&DataKey::Totals, &totals);
    }

    pub fn get_campaign(env: Env, campaign_id: String) -> Campaign {
        let campaigns: Map<String, Campaign> =
            env.storage().instance().get(&DataKey::Campaigns).unwrap();
        campaigns.get(campaign_id).expect("Campaign not found")
    }

    pub fn get_donations(env: Env, campaign_id: String) -> Vec<Donation> {
        let donations: Map<String, Vec<Donation>> =
            env.storage().instance().get(&DataKey::Donations).unwrap();
        donations.get(campaign_id).unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_total_raised(env: Env, campaign_id: String) -> i128 {
        let totals: Map<String, i128> = env.storage().instance().get(&DataKey::Totals).unwrap();
        totals.get(campaign_id).unwrap_or(0)
    }

    pub fn get_all_campaigns(env: Env) -> Vec<Campaign> {
        let campaign_ids: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::CampaignIds)
            .unwrap_or_else(|| Vec::new(&env));

        let campaigns: Map<String, Campaign> = env
            .storage()
            .instance()
            .get(&DataKey::Campaigns)
            .unwrap_or_else(|| Map::new(&env));

        let mut result: Vec<Campaign> = Vec::new(&env);

        for id in campaign_ids.iter() {
            if let Some(campaign) = campaigns.get(id) {
                result.push_back(campaign);
            }
        }

        result
    }

    pub fn get_donor_count(env: Env, campaign_id: String) -> u32 {
        let donations: Map<String, Vec<Donation>> =
            env.storage().instance().get(&DataKey::Donations).unwrap();

        let campaign_donations: Vec<Donation> =
            donations.get(campaign_id).unwrap_or_else(|| Vec::new(&env));

        // Count unique donors
        let mut unique_donors: Vec<Address> = Vec::new(&env);

        for donation in campaign_donations.iter() {
            if !unique_donors.contains(&donation.donor) {
                unique_donors.push_back(donation.donor);
            }
        }

        unique_donors.len()
    }
}

mod test;
